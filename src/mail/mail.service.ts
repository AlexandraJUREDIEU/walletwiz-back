import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';

@Injectable()
export class MailService {
  private readonly brevoApi: SibApiV3Sdk.TransactionalEmailsApi;

  constructor(private readonly configService: ConfigService) {
    const brevoClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = brevoClient.authentications['api-key'];
    apiKey.apiKey = this.configService.get<string>('BREVO_API_KEY');

    this.brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();
  }

  async sendVerificationCode(email: string, code: string) {
    const env = this.configService.get<string>('NODE_ENV');
    const forceTo = this.configService.get<string>('FORCE_EMAIL_TO');
    const recipient = env === 'dev' && forceTo ? forceTo : email;

    const senderEmail =
      this.configService.get<string>('EMAIL_FROM') ||
      'no-reply@atwodigitalagency.com';

    await this.brevoApi.sendTransacEmail({
      to: [{ email: recipient }],
      sender: { name: 'WalletWiz', email: senderEmail },
      subject: 'Votre code WalletWiz',
      templateId: 6,
      params: {
        code,
      },
    });
  }

  async sendInvitationEmail({
    to,
    invitedBy,
    link,
    declinedLink,
  }: {
    to: string;
    invitedBy: string;
    link: string;
    declinedLink?: string;
  }) {
    const env = this.configService.get<string>('NODE_ENV');
    const forceTo = this.configService.get<string>('FORCE_EMAIL_TO');
    const recipient = env === 'dev' && forceTo ? forceTo : to;

    const senderEmail =
      this.configService.get<string>('EMAIL_FROM') ||
      'no-reply@atwodigitalagency.com';

    await this.brevoApi.sendTransacEmail({
      to: [{ email: recipient }],
      sender: { name: 'WalletWiz', email: senderEmail },
      subject: 'Invitation à rejoindre une session',
      templateId: 7,
      params: {
        invitedBy,
        link,
        declinedLink,
      },
    });
  }

  async sendResetPasswordEmail(email: string, link: string) {
    const env = this.configService.get<string>('NODE_ENV');
    const forceTo = this.configService.get<string>('FORCE_EMAIL_TO');
    const recipient = env === 'dev' && forceTo ? forceTo : email;

    const senderEmail =
      this.configService.get<string>('EMAIL_FROM') ||
      'no-reply@atwodigitalagency.com';

    console.log(`📩 Envoi du mail de réinitialisation à : ${recipient}`);

    await this.brevoApi.sendTransacEmail({
      to: [{ email: recipient }],
      sender: { name: 'WalletWiz', email: senderEmail },
      subject: 'Réinitialisation de votre mot de passe',
      templateId: 8,
      params: {
        link,
      },
    });
  }
}
