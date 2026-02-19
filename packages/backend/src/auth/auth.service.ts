import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokenExpirationHours: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.refreshTokenExpirationHours = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRATION_HOURS',
      24,
    );
  }

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
