import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SessionMembersService } from './session-members.service';
import { CreateSessionMemberDto } from './dto/create-session-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('sessions/:id/invite')
export class SessionMembersController {
  constructor(private readonly sessionMembersService: SessionMembersService) {}

  @Post()
  invite(
    @Param('id') sessionId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSessionMemberDto
  ) {
    return this.sessionMembersService.invite(sessionId, user.id, dto);
  }
}
