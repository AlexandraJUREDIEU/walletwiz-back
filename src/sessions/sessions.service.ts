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
    const memberships = await this.prisma.sessionMember.findMany({
      where: {
        userId,
        invitationStatus: 'ACCEPTED',
      },
      include: {
        session: true,
      },
    });

    return memberships.map((m) => m.session);
  }
}