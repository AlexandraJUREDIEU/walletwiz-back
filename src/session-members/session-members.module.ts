import { Module } from '@nestjs/common';
import { SessionMembersService } from './session-members.service';
import { SessionMembersController } from './session-members.controller';

@Module({
  controllers: [SessionMembersController],
  providers: [SessionMembersService],
})
export class SessionMembersModule {}
