import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') ??
      'product@aiseoptimizer.com';

    if (!apiKey) {
      this.logger.error('⚠️ RESEND_API_KEY is not set!');
      throw new Error('RESEND_API_KEY is required');
    }

    this.resend = new Resend(apiKey);
    this.logger.log(`✅ Resend initialized successfully`);
    this.logger.log(`📧 Sending emails from: ${this.fromEmail}`);
  }

  /* Sends email verification link */
  async sendVerificationEmail(email: string, url: string): Promise<void> {
    const htmlTemplate = this.getVerificationEmailTemplate(url);

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'E-posta Adresinizi Doğrulayın',
        html: htmlTemplate,
      });

      if (error) {
        this.logger.error(`❌ Resend error for ${email}:`, error);
        throw new Error(`Failed to send: ${error.message}`);
      }

      this.logger.log(
        `✅ Verification email sent to ${email}. Message ID: ${data?.id}`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /* Sends password reset link */
  async sendPasswordReset(email: string, url: string): Promise<void> {
    const htmlTemplate = this.getPasswordResetTemplate(url);

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Şifre Sıfırlama Talebi',
        html: htmlTemplate,
      });

      if (error) {
        this.logger.error(`❌ Resend error for ${email}:`, error);
        throw new Error(`Failed to send: ${error.message}`);
      }

      this.logger.log(
        `✅ Password reset sent to ${email}. Message ID: ${data?.id}`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /* Returns HTML template for email verification */
  private getVerificationEmailTemplate(url: string): string {
    return `
      <!DOCTYPE html>
      <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>E-posta Doğrulama</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f7f7f7;
              margin: 0;
              padding: 0;
            }
            .email-container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              background-color: #007bff;
              color: #ffffff;
              text-align: center;
              padding: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 20px;
              color: #333333;
            }
            .verify-button {
              display: inline-block;
              text-align: center;
              margin: 30px 0;
              padding: 15px 40px;
              background-color: #007bff;
              border-radius: 5px;
              text-decoration: none;
            }
            .verify-button:hover {
              background-color: #0056b3;
            }
            .button-text {
              color: #ffffff;
              font-weight: bold;
              font-size: 16px;
            }
            .footer {
              text-align: center;
              padding: 15px;
              font-size: 12px;
              color: #777777;
              background-color: #f7f7f7;
            }
            .footer a {
              color: #007bff;
              text-decoration: none;
            }
            .alternative-link {
              margin-top: 20px;
              padding: 15px;
              background-color: #f5f5f5;
              border-radius: 4px;
              word-break: break-all;
              font-size: 12px;
              color: #666666;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>E-posta Doğrulama</h1>
            </div>
            <div class="content">
              <p>Merhaba,</p>
              <p>Hesabınızı oluşturduğunuz için teşekkür ederiz! E-posta adresinizi doğrulamak için lütfen aşağıdaki butona tıklayın:</p>
              <a href="${url}" class="verify-button">
                <span class="button-text">E-postamı Doğrula</span>
              </a>
              <p>Bu bağlantı güvenlik nedeniyle <strong>24 saat</strong> içinde geçerliliğini yitirecektir.</p>
              <p>Eğer bu hesabı siz oluşturmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
              <div class="alternative-link">
                <p><strong>Buton çalışmıyor mu?</strong> Aşağıdaki bağlantıyı kopyalayıp tarayıcınıza yapıştırın:</p>
                <p>${url}</p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2025 AI SEO Optimizer. Tüm hakları saklıdır.</p>
              <p><a href="https://mvp.aiseoptimizer.com">Sitemizi Ziyaret Edin</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /* Returns HTML template for password reset */
  private getPasswordResetTemplate(url: string): string {
    return `
      <!DOCTYPE html>
      <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Şifre Sıfırlama</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f7f7f7;
              margin: 0;
              padding: 0;
            }
            .email-container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              background-color: #dc3545;
              color: #ffffff;
              text-align: center;
              padding: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 20px;
              color: #333333;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .reset-button {
              display: inline-block;
              padding: 15px 40px;
              background-color: #dc3545;
              color: #ffffff;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              font-size: 16px;
            }
            .reset-button:hover {
              background-color: #c82333;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              padding: 15px;
              font-size: 12px;
              color: #777777;
              background-color: #f7f7f7;
            }
            .footer a {
              color: #007bff;
              text-decoration: none;
            }
            .alternative-link {
              margin-top: 20px;
              padding: 15px;
              background-color: #f5f5f5;
              border-radius: 4px;
              word-break: break-all;
              font-size: 12px;
              color: #666666;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>Şifre Sıfırlama</h1>
            </div>
            <div class="content">
              <p>Merhaba,</p>
              <p>Hesabınız için şifre sıfırlama talebinde bulunuldu. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
              <div class="button-container">
                <a href="${url}" class="reset-button">Şifremi Sıfırla</a>
              </div>
              <div class="warning">
                <p><strong>⚠️ Güvenlik Uyarısı:</strong></p>
                <p>Bu bağlantı güvenlik nedeniyle <strong>1 saat</strong> içinde geçerliliğini yitirecektir.</p>
              </div>
              <p>Eğer şifre sıfırlama talebinde bulunmadıysanız, lütfen bu e-postayı dikkate almayın ve hesabınızın güvenliğini kontrol edin.</p>
              <div class="alternative-link">
                <p><strong>Buton çalışmıyor mu?</strong> Aşağıdaki bağlantıyı kopyalayıp tarayıcınıza yapıştırın:</p>
                <p>${url}</p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2025 AI SEO Optimizer. Tüm hakları saklıdır.</p>
              <p><a href="https://mvp.aiseoptimizer.com">Sitemizi Ziyaret Edin</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
