import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { debugLog } from '../../common/utils/debug-log';

// Constantes de configuração
const TOKEN_EXPIRATION_MINUTES = 15;
const TOKEN_LENGTH = 32; // bytes, resultará em 64 caracteres hex

// Evento emitido quando um reset é solicitado
export interface PasswordResetRequestedEvent {
  userId: number;
  email: string;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Gera um token seguro de alta entropia
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
  }

  /**
   * Calcula a data de expiração do token
   */
  private calculateExpirationDate(): Date {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + TOKEN_EXPIRATION_MINUTES);
    return expiresAt;
  }

  /**
   * Solicita reset de senha
   * Retorna sempre sucesso para não revelar se o usuário existe
   */
  async solicitarReset(email: string): Promise<{ sucesso: boolean; mensagem: string }> {
    const mensagemNeutra =
      'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.';

    try {
      // Busca usuário pelo email
      const usuario = await this.prisma.usuario.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { id: true, email: true, status: true },
      });

      // Se usuário não existe ou está inativo, retorna sucesso sem fazer nada
      // Isso evita enumeração de usuários
      if (!usuario || usuario.status !== 'ativo') {
        debugLog(
          'PasswordResetService',
          `Tentativa de reset para email inexistente ou inativo: ${email}`,
        );
        return { sucesso: true, mensagem: mensagemNeutra };
      }

      // Invalida tokens anteriores não utilizados do mesmo usuário
      await this.invalidarTokensAnteriores(usuario.id);

      // Gera novo token
      const token = this.generateSecureToken();
      const expiresAt = this.calculateExpirationDate();

      // Salva o token no banco
      await this.prisma.passwordResetToken.create({
        data: {
          usuario_id: usuario.id,
          token,
          expires_at: expiresAt,
        },
      });

      debugLog('PasswordResetService', `Token de reset criado para usuário ${usuario.id}`);

      // Emite evento para possível envio de email (não implementado agora)
      const event: PasswordResetRequestedEvent = {
        userId: usuario.id,
        email: usuario.email,
        token,
        expiresAt,
      };
      this.eventEmitter.emit('password.reset.requested', event);

      return { sucesso: true, mensagem: mensagemNeutra };
    } catch (error) {
      this.logger.error(
        `Erro ao solicitar reset: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
      // Mesmo em caso de erro interno, retornamos sucesso para não revelar informações
      return { sucesso: true, mensagem: mensagemNeutra };
    }
  }

  /**
   * Valida se um token é válido (existe, não expirou, não foi usado)
   */
  async validarToken(token: string): Promise<{ valido: boolean }> {
    try {
      const tokenRecord = await this.prisma.passwordResetToken.findUnique({
        where: { token },
        select: {
          id: true,
          expires_at: true,
          used_at: true,
        },
      });

      if (!tokenRecord) {
        debugLog('PasswordResetService', `Token de reset não encontrado`);
        return { valido: false };
      }

      // Verifica se já foi usado
      if (tokenRecord.used_at) {
        debugLog('PasswordResetService', `Token de reset já utilizado: ${tokenRecord.id}`);
        return { valido: false };
      }

      // Verifica se expirou
      if (new Date() > tokenRecord.expires_at) {
        debugLog('PasswordResetService', `Token de reset expirado: ${tokenRecord.id}`);
        return { valido: false };
      }

      return { valido: true };
    } catch (error) {
      this.logger.error(
        `Erro ao validar token: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
      return { valido: false };
    }
  }

  /**
   * Confirma o reset e altera a senha do usuário
   */
  async confirmarReset(
    token: string,
    novaSenha: string,
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    try {
      // Busca o token com dados do usuário
      const tokenRecord = await this.prisma.passwordResetToken.findUnique({
        where: { token },
        include: {
          usuario: {
            select: { id: true, email: true, status: true },
          },
        },
      });

      // Valida o token
      if (!tokenRecord) {
        throw new BadRequestException('Token inválido ou expirado.');
      }

      if (tokenRecord.used_at) {
        throw new BadRequestException('Este link de redefinição já foi utilizado.');
      }

      if (new Date() > tokenRecord.expires_at) {
        throw new BadRequestException('Este link de redefinição expirou. Solicite um novo.');
      }

      if (tokenRecord.usuario.status !== 'ativo') {
        throw new BadRequestException(
          'Não foi possível redefinir a senha. Entre em contato com o suporte.',
        );
      }

      // Gera hash da nova senha
      const senhaHash = await bcrypt.hash(novaSenha, 10);

      // Atualiza senha e marca token como usado em uma transação
      await this.prisma.$transaction([
        // Atualiza a senha do usuário
        this.prisma.usuario.update({
          where: { id: tokenRecord.usuario_id },
          data: { senha: senhaHash },
        }),
        // Marca o token como usado
        this.prisma.passwordResetToken.update({
          where: { id: tokenRecord.id },
          data: { used_at: new Date() },
        }),
        // Invalida todos os outros tokens do usuário (opcional, mas recomendado)
        this.prisma.passwordResetToken.updateMany({
          where: {
            usuario_id: tokenRecord.usuario_id,
            id: { not: tokenRecord.id },
            used_at: null,
          },
          data: { used_at: new Date() },
        }),
      ]);

      debugLog(
        'PasswordResetService',
        `Senha redefinida com sucesso para usuário ${tokenRecord.usuario_id}`,
      );

      // Emite evento de senha alterada
      this.eventEmitter.emit('password.reset.completed', {
        userId: tokenRecord.usuario_id,
        email: tokenRecord.usuario.email,
      });

      return {
        sucesso: true,
        mensagem: 'Senha redefinida com sucesso. Você já pode fazer login com sua nova senha.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Erro ao confirmar reset: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
      throw new BadRequestException('Não foi possível redefinir a senha. Tente novamente.');
    }
  }

  /**
   * Invalida tokens anteriores não utilizados de um usuário
   */
  private async invalidarTokensAnteriores(usuarioId: number): Promise<void> {
    const result = await this.prisma.passwordResetToken.updateMany({
      where: {
        usuario_id: usuarioId,
        used_at: null,
      },
      data: {
        used_at: new Date(),
      },
    });

    if (result.count > 0) {
      debugLog(
        'PasswordResetService',
        `${result.count} token(s) anterior(es) invalidado(s) para usuário ${usuarioId}`,
      );
    }
  }

  /**
   * Limpa tokens expirados (para uso em job de limpeza)
   */
  async limparTokensExpirados(): Promise<number> {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expires_at: { lt: new Date() } }, { used_at: { not: null } }],
      },
    });

    if (result.count > 0) {
      debugLog('PasswordResetService', `${result.count} token(s) expirado(s)/usado(s) removido(s)`);
    }

    return result.count;
  }
}
