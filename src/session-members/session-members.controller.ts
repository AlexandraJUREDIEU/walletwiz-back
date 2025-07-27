import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Get,
} from '@nestjs/common';
import { SessionMembersService } from './session-members.service';
import { CreateSessionMemberDto } from './dto/create-session-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('sessions')
export class SessionMembersController {
  constructor(private readonly sessionMembersService: SessionMembersService) {}
  
  @UseGuards(JwtAuthGuard)
  @Get(':id/members')
  findAllBySessionId(@Param('id') sessionId: string , @CurrentUser() user: { sub: string }) {
    return this.sessionMembersService.getMembersBySession(sessionId, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/invite')
  invite(
    @Param('id') sessionId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateSessionMemberDto
  ) {
    console.log('🔥 SessionMembersController: invite() called');
    console.log('sessionId:', sessionId);
    console.log('user:', user);
    return this.sessionMembersService.invite(sessionId, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invite/:token')
  getInvitation(@Param('token') token: string) {
    return this.sessionMembersService.getInvitationByToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invite/:token')
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: { sub: string }
  ) {
    return this.sessionMembersService.acceptInvitationByToken(token, user.sub);
  }

  @Post('invite/:token/declined')
  refuseInvitation(
    @Param('token') token: string,
  ) {
    return this.sessionMembersService.refuseInvitationByToken(token);
  }
}
