import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationCode(email: string, code: string) {
    // 🔄 Si on est en développement, forcer l’envoi vers un email de test
    const env = this.configService.get<string>('NODE_ENV');
    const forceTo = this.configService.get<string>('FORCE_EMAIL_TO');
    const recipient = env === 'development' && forceTo ? forceTo : email;

    // ✅ Log pour confirmation
    console.log(`📩 Envoi du mail à : ${recipient}`);

    await this.mailerService.sendMail({
      to: recipient,
      subject: 'Vérification de votre email',
      template: './verify', // le template est optionnel si on envoie du texte brut
      context: {
        code,
      },
      html: `<p>Votre code de vérification est : <strong>${code}</strong></p>`,
    });
  }
}