import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateSessionDto } from './dto/create-session.dto'
import { UpdateSessionDto } from './dto/update-session.dto'

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /// Crée une nouvelle session liée à l'utilisateur connecté
  async create(userId: string, dto: CreateSessionDto) {
    return this.prisma.sessions.create({
      data: {
        ownerId: userId,
        name: dto.name,
      },
      include: {
        owner: {
          select: {
            email: true,
          },
        },
      },
    })
  }

  /// Récupère toutes les sessions créées par l'utilisateur connecté
  async findAll(userId: string) {
    return this.prisma.sessions.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            email: true,
          },
        },
      },
    })
  }

  /// Met à jour une session si elle appartient à l'utilisateur
  async update(userId: string, sessionId: string, dto: UpdateSessionDto) {
    const session = await this.prisma.sessions.findUnique({ where: { id: sessionId } })

    if (!session) throw new NotFoundException('Session non trouvée')
    if (session.ownerId !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette session")
    }

    return this.prisma.sessions.update({
      where: { id: sessionId },
      data: dto,
      include: {
        owner: {
          select: {
            email: true,
          },
        },
      },
    })
  }

  /// Supprime une session si elle appartient à l'utilisateur
  async remove(userId: string, sessionId: string) {
    const session = await this.prisma.sessions.findUnique({ where: { id: sessionId } })

    if (!session) throw new NotFoundException('Session non trouvée')
    if (session.ownerId !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer cette session")
    }

    return this.prisma.sessions.delete({ where: { id: sessionId } })
  }
}
