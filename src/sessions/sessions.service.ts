import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, email: string, dto: CreateSessionDto) {
    return this.prisma.session.create({
      data: {
        name: dto.name ?? null,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: 'OWNER',
            invitationStatus: 'ACCEPTED',
            invitedEmail: email, 
          },
        },
      },
    });
  }

  async findAllByUser(userId: string) {
      // Retourne uniquement les sessions dont l'utilisateur est propriétaire
    return this.prisma.session.findMany({
      where: {
        ownerId: userId,
      },
    });
  }
}