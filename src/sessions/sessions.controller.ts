import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  // * Endpoint to create a new session
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createSessionDto: CreateSessionDto, @Req() req: any) {
    const userId = req.user?.sub; // Assuming user is attached to the request by JwtAuthGuard
    return this.sessionsService.create(
      userId,
      req.user?.email,
      createSessionDto,
    );
  }
  // * Endpoint to get all sessions for the authenticated user
  @Get()
  findAll(@Req() req: any) {
    const userId = req.user?.sub;
    return this.sessionsService.findAllByUser(userId);
  }
}
