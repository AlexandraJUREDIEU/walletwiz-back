import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { SessionsModule } from './sessions/sessions.module';
import { SessionMembersModule } from './session-members/session-members.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    MailModule,
    SessionsModule,
    SessionMembersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
