import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { LoginDto } from './dto/auth.dto';
import { RegistrarClienteDto } from './dto/registrar-cliente.dto';
import { PAPEL_CLIENTE_ADMIN } from './roles.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokenExpirationHours: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    this.refreshTokenExpirationHours = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRATION_HOURS',
      24,
    );
  }

  // =========================================================================
  // AUTO-CADASTRO PÚBLICO
  // =========================================================================

  /**
   * Registra um novo cliente (empresa) + usuário responsável (CLIENTE_ADMIN).
   * Transação atômica: se qualquer etapa falhar, nenhum registro é criado.
   * Cliente fica com status 'pendente_aprovacao', Usuário com status 'inativo'.
   */
  async registrarCliente(dto: RegistrarClienteDto) {
    // 1. Validar unicidade CNPJ
    const cnpjExistente = await this.prisma.cliente.findFirst({
      where: { cnpj: dto.cnpj },
    });
    if (cnpjExistente) {
      throw new ConflictException('CNPJ já cadastrado no sistema');
    }

    // 2. Validar unicidade email do responsável
    const emailExistente = await this.prisma.usuario.findFirst({
      where: { email: dto.email_responsavel },
    });
    if (emailExistente) {
      throw new ConflictException('Email já cadastrado no sistema');
    }

    // 3. Hash da senha
    const senhaHash = await bcrypt.hash(dto.senha, 10);

    // 4. Buscar papel CLIENTE_ADMIN
    const papelClienteAdmin = await this.prisma.papel.findFirst({
      where: { codigo: PAPEL_CLIENTE_ADMIN },
    });
    if (!papelClienteAdmin) {
      throw new InternalServerErrorException(
        'Papel CLIENTE_ADMIN não configurado no sistema. Contacte o administrador.',
      );
    }

    // 5. Transação atômica: criar Cliente + Usuário
    const resultado = await this.prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.create({
        data: {
          razao_social: dto.razao_social,
          nome_fantasia: dto.nome_fantasia || dto.razao_social,
          cnpj: dto.cnpj,
          email: dto.email_empresa,
          telefone: dto.telefone || '',
          status: 'pendente_aprovacao',
        },
      });

      const usuario = await tx.usuario.create({
        data: {
          nome: dto.nome_responsavel,
          email: dto.email_responsavel,
          senha: senhaHash,
          papel_id: papelClienteAdmin.id,
          cliente_id: cliente.id,
          status: 'inativo', // inativo até aprovação do admin
        },
      });

      return { cliente, usuario };
    });

    // 6. Enviar email de confirmação ao solicitante (fire-and-forget)
    this.emailService
      .enviarEmail({
        to: dto.email_responsavel,
        subject: "Cadastro recebido — Lino's Panificadora",
        text: `Olá ${dto.nome_responsavel}, seu cadastro para ${dto.razao_social} foi recebido e está em análise. Você será notificado por email quando for aprovado.`,
      })
      .catch((err) => this.logger.error(`Erro ao enviar email de confirmação: ${err.message}`));

    this.logger.log(
      `Novo auto-cadastro: clienteId=${resultado.cliente.id}, cnpj=${dto.cnpj}, email=${dto.email_responsavel}`,
    );

    return {
      message: 'Cadastro recebido com sucesso. Aguarde aprovação.',
      clienteId: resultado.cliente.id,
    };
  }

  // =========================================================================
  // LOGIN
  // =========================================================================

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: loginDto.email },
      include: {
        papel: true,
      },
    });

    if (!usuario || usuario.status.toLowerCase() !== 'ativo') {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(loginDto.senha, usuario.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar status do cliente vinculado (se houver)
    if (usuario.cliente_id) {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: usuario.cliente_id },
      });
      if (cliente) {
        if (cliente.status === 'pendente_aprovacao') {
          throw new UnauthorizedException('Empresa aguardando aprovação');
        }
        if (cliente.status === 'rejeitado') {
          throw new UnauthorizedException('Cadastro da empresa foi rejeitado');
        }
        if (cliente.status === 'suspenso') {
          throw new UnauthorizedException(
            'Empresa suspensa. Entre em contato com o suporte',
          );
        }
        if (cliente.status === 'inativo') {
          throw new UnauthorizedException('Empresa inativa');
        }
      }
    }

    // Parse permissões do formato JSON
    const permissoes = JSON.parse(usuario.papel.permissoes);

    // Revogar TODOS os refresh tokens anteriores (single-session)
    await this.prisma.refreshToken.updateMany({
      where: {
        usuario_id: usuario.id,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });

    // Gerar refresh token opaco
    const refreshTokenValue = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.refreshTokenExpirationHours);

    // Salvar refresh token no banco
    await this.prisma.refreshToken.create({
      data: {
        usuario_id: usuario.id,
        token: refreshTokenValue,
        ip_address: ipAddress || null,
        user_agent: userAgent ? userAgent.substring(0, 255) : null,
        expires_at: expiresAt,
      },
    });

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      clienteId: usuario.cliente_id || null,
      papel: {
        id: usuario.papel.id,
        nome: usuario.papel.nome,
        codigo: usuario.papel.codigo,
        tipo: usuario.papel.tipo,
        nivel: usuario.papel.nivel,
      },
      permissoes,
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshTokenValue,
      expires_in: 900, // 15 minutos em segundos
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        clienteId: usuario.cliente_id || null,
        papel: {
          id: usuario.papel.id,
          nome: usuario.papel.nome,
          codigo: usuario.papel.codigo,
          tipo: usuario.papel.tipo,
          nivel: usuario.papel.nivel,
          permissoes,
        },
      },
    };
  }

  // =========================================================================
  // REFRESH
  // =========================================================================

  async refresh(refreshTokenValue: string, ipAddress?: string, userAgent?: string) {
    // Buscar o refresh token no banco
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: {
        usuario: {
          include: { papel: true },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Token inválido');
    }

    if (storedToken.revoked_at) {
      throw new UnauthorizedException('Token já foi revogado');
    }

    if (storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Token expirado');
    }

    // Log de warning se IP ou User-Agent mudaram
    if (ipAddress && storedToken.ip_address && ipAddress !== storedToken.ip_address) {
      this.logger.warn(
        `Refresh token usado de IP diferente: original=${storedToken.ip_address}, atual=${ipAddress}, usuario_id=${storedToken.usuario_id}`,
      );
    }
    if (userAgent && storedToken.user_agent && userAgent.substring(0, 255) !== storedToken.user_agent) {
      this.logger.warn(
        `Refresh token usado de User-Agent diferente: usuario_id=${storedToken.usuario_id}`,
      );
    }

    const usuario = storedToken.usuario;

    // Verificar se o usuário ainda está ativo
    if (usuario.status.toLowerCase() !== 'ativo') {
      throw new UnauthorizedException('Usuário inativo');
    }

    // Verificar status do cliente vinculado (se houver)
    if (usuario.cliente_id) {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: usuario.cliente_id },
      });
      if (cliente && cliente.status !== 'ativo') {
        throw new UnauthorizedException('Empresa não está ativa');
      }
    }

    // Revogar o token usado (rotation - one-time use)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked_at: new Date() },
    });

    // Gerar novo refresh token
    const newRefreshTokenValue = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.refreshTokenExpirationHours);

    await this.prisma.refreshToken.create({
      data: {
        usuario_id: usuario.id,
        token: newRefreshTokenValue,
        ip_address: ipAddress || null,
        user_agent: userAgent ? userAgent.substring(0, 255) : null,
        expires_at: expiresAt,
      },
    });

    // Parse permissões
    const permissoes = JSON.parse(usuario.papel.permissoes);

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      clienteId: usuario.cliente_id || null,
      papel: {
        id: usuario.papel.id,
        nome: usuario.papel.nome,
        codigo: usuario.papel.codigo,
        tipo: usuario.papel.tipo,
        nivel: usuario.papel.nivel,
      },
      permissoes,
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: newRefreshTokenValue,
      expires_in: 900,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        clienteId: usuario.cliente_id || null,
        papel: {
          id: usuario.papel.id,
          nome: usuario.papel.nome,
          codigo: usuario.papel.codigo,
          tipo: usuario.papel.tipo,
          nivel: usuario.papel.nivel,
          permissoes,
        },
      },
    };
  }

  // =========================================================================
  // LOGOUT
  // =========================================================================

  async logout(refreshTokenValue: string) {
    // Revogar o refresh token (idempotente - não falha se já revogado ou inexistente)
    const token = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
    });

    if (token && !token.revoked_at) {
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revoked_at: new Date() },
      });
    }

    return { message: 'Logout realizado com sucesso' };
  }

  // =========================================================================
  // UTILITÁRIOS
  // =========================================================================

  async limparTokensExpirados() {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expires_at: { lt: new Date() },
        revoked_at: { not: null },
      },
    });

    this.logger.debug(`Tokens expirados removidos: ${result.count}`);
    return result.count;
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
