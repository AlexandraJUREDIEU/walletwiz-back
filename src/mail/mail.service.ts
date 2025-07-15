import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationCode(email: string, code: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Votre code de vérification WalletWiz',
      text: `Votre code de vérification est : ${code}`,
      html: `<p>Bonjour,</p><p>Votre code de vérification est : <strong>${code}</strong></p><p>Merci d'utiliser WalletWiz !</p>`,
    });
  }
}