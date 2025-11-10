/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_SERVER_HOST'),
      port: parseInt(
        this.configService.get<string>('EMAIL_SERVER_PORT') ?? '465',
      ),
      secure: this.configService.get<string>('EMAIL_SERVER_PORT') === '465',
      auth: {
        user: this.configService.get<string>('EMAIL_SERVER_USER'),
        pass: this.configService.get<string>('EMAIL_SERVER_PASSWORD'),
      },
    });
  }

  /* Sends email verification link */
  async sendVerificationEmail(email: string, url: string): Promise<void> {
    const htmlTemplate = this.getVerificationEmailTemplate(url);

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        subject: 'E-posta Adresinizi Doğrulayın',
        html: htmlTemplate,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /* Sends password reset link */
  async sendPasswordReset(email: string, url: string): Promise<void> {
    const htmlTemplate = this.getPasswordResetTemplate(url);

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        subject: 'Şifre Sıfırlama Talebi',
        html: htmlTemplate,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send password reset email:', error);
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
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .verify-button {
              display: inline-block;
              padding: 15px 40px;
              background-color: #007bff;
              color: #ffffff;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              font-size: 16px;
            }
            .verify-button:hover {
              background-color: #0056b3;
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
              <div class="button-container">
                <a href="${url}" class="verify-button">E-postamı Doğrula</a>
              </div>
              <p>Bu bağlantı güvenlik nedeniyle <strong>24 saat</strong> içinde geçerliliğini yitirecektir.</p>
              <p>Eğer bu hesabı siz oluşturmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
              <div class="alternative-link">
                <p><strong>Buton çalışmıyor mu?</strong> Aşağıdaki bağlantıyı kopyalayıp tarayıcınıza yapıştırın:</p>
                <p>${url}</p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2025 Hukuk Sitesi. Tüm hakları saklıdır.</p>
              <p><a href="https://www.hukuk-sitesi.com">Sitemizi Ziyaret Edin</a></p>
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
              <p>&copy; 2025 Hukuk Sitesi. Tüm hakları saklıdır.</p>
              <p><a href="https://www.hukuk-sitesi.com">Sitemizi Ziyaret Edin</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
