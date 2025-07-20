import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() createSessionDto: CreateSessionDto
  ) {
    return this.sessionsService.create(user.id, createSessionDto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.sessionsService.findAllByUser(user.id);
  }
}