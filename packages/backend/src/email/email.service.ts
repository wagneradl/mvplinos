import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { Resend } from 'resend';
import { PasswordResetRequestedEvent } from '../auth/services/password-reset.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly frontendUrl: string;
  private readonly isMock: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isMock = this.configService.get<string>('EMAIL_MOCK', 'false') === 'true';
    this.from = this.configService.get<string>(
      'EMAIL_FROM',
      "Lino's Panificadora <noreply@resend.dev>",
    );
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    if (this.isMock) {
      this.resend = null;
      this.logger.warn('EmailService em modo MOCK — emails serão logados no console');
    } else {
      const apiKey = this.configService.get<string>('RESEND_API_KEY');
      if (!apiKey) {
        this.logger.error(
          'RESEND_API_KEY não configurada e EMAIL_MOCK não está ativo. Emails não serão enviados.',
        );
        this.resend = null;
      } else {
        this.resend = new Resend(apiKey);
        this.logger.log('EmailService inicializado com Resend');
      }
    }
  }

  /**
   * Envia um email genérico via Resend (ou loga em modo MOCK).
   * Método público reutilizável para qualquer módulo que precise enviar emails.
   */
  async enviarEmail(params: { to: string; subject: string; text?: string; html?: string }): Promise<void> {
    const { to, subject, text, html } = params;

    if (this.isMock) {
      this.logger.log('=== EMAIL MOCK ===');
      this.logger.log(`Para: ${to}`);
      this.logger.log(`Assunto: ${subject}`);
      if (text) this.logger.log(`Texto: ${text}`);
      this.logger.log('=== FIM EMAIL MOCK ===');
      return;
    }

    if (!this.resend) {
      this.logger.error(`Não foi possível enviar email para ${to}: Resend não configurado`);
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html: html || text || '',
      });

      if (error) {
        this.logger.error(`Falha ao enviar email para ${to}: ${error.message}`);
        return;
      }

      this.logger.log(`Email enviado para ${to} (id: ${data?.id})`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email para ${to}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
    }
  }

  @OnEvent('password.reset.requested')
  async handlePasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
    const { email, token, expiresAt } = event;
    const resetUrl = `${this.frontendUrl}/reset-senha?token=${token}`;

    const html = this.buildResetPasswordHtml({
      resetUrl,
      expiresAt,
    });

    const subject = 'Redefinição de senha — Lino\'s Panificadora';

    if (this.isMock) {
      this.logger.log('=== EMAIL MOCK ===');
      this.logger.log(`Para: ${email}`);
      this.logger.log(`De: ${this.from}`);
      this.logger.log(`Assunto: ${subject}`);
      this.logger.log(`Link de reset: ${resetUrl}`);
      this.logger.log(`Expira em: ${expiresAt.toISOString()}`);
      this.logger.log('=== FIM EMAIL MOCK ===');
      return;
    }

    if (!this.resend) {
      this.logger.error(
        `Não foi possível enviar email de reset para ${email}: Resend não configurado`,
      );
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Falha ao enviar email de reset para ${email}: ${error.message}`);
        return;
      }

      this.logger.log(`Email de reset enviado para ${email} (id: ${data?.id})`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email de reset para ${email}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
    }
  }

  private buildResetPasswordHtml(params: {
    resetUrl: string;
    expiresAt: Date;
  }): string {
    const { resetUrl, expiresAt } = params;
    const expiresFormatted = expiresAt.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#8B4513; padding:24px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:bold;">Lino's Panificadora</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;">
              <h2 style="margin:0 0 16px; color:#333333; font-size:18px;">Redefinição de Senha</h2>
              <p style="margin:0 0 16px; color:#555555; font-size:14px; line-height:1.6;">
                Você solicitou a redefinição da sua senha. Clique no botão abaixo para criar uma nova senha:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:16px 0 24px;">
                    <a href="${resetUrl}" style="display:inline-block; background-color:#8B4513; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:6px; font-size:14px; font-weight:bold;">
                      Redefinir minha senha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px; color:#777777; font-size:12px; line-height:1.5;">
                Este link expira em <strong>15 minutos</strong> (até ${expiresFormatted}).
              </p>
              <p style="margin:0 0 8px; color:#777777; font-size:12px; line-height:1.5;">
                Se você não solicitou esta redefinição, ignore este email — sua senha permanecerá inalterada.
              </p>
              <hr style="border:none; border-top:1px solid #eeeeee; margin:24px 0 16px;">
              <p style="margin:0; color:#999999; font-size:11px; line-height:1.5;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <a href="${resetUrl}" style="color:#8B4513; word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f9f9; padding:16px 24px; text-align:center;">
              <p style="margin:0; color:#999999; font-size:11px;">
                &copy; ${new Date().getFullYear()} Lino's Panificadora — Todos os direitos reservados
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
  }
}
