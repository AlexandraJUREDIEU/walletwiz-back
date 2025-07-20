import { Module } from '@nestjs/common';
import { SessionMembersService } from './session-members.service';
import { SessionMembersController } from './session-members.controller';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [SessionMembersController],
  providers: [SessionMembersService],
})
export class SessionMembersModule {}
