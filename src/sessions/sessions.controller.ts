import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard';
import { GetUser } from 'src/auth/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /// Crée une nouvelle session
  @Post()
  create(@GetUser() user: any, @Body() dto: CreateSessionDto) {
    return this.sessionsService.create(user.userId, dto)
  }

  /// Récupère toutes les sessions créées par l'utilisateur connecté
  @Get()
  findAll(@GetUser() user: any) {
    return this.sessionsService.findAll(user.userId)
  }

  /// Met à jour une session si elle appartient à l'utilisateur
  @Patch(':id')
  update(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionsService.update(user.userId, id, dto)
  }

  /// Définit une session comme par défaut si elle appartient à l'utilisateur
  @Patch(':id/default')
  setDefault(@GetUser() user: any, @Param('id') id: string) {
    return this.sessionsService.setDefault(user.userId, id)
  }

  /// Supprime une session si elle appartient à l'utilisateur
  @Delete(':id')
  remove(@GetUser() user: any, @Param('id') id: string) {
    return this.sessionsService.remove(user.userId, id)
  }
}

