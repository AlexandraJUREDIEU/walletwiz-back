import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { SessionsModule } from './sessions/sessions.module';
import { SessionMembersModule } from './session-members/session-members.module';
import { BankAccountModule } from './bank-account/bank-account.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    MailModule,
    SessionsModule,
    SessionMembersModule,
    BankAccountModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
