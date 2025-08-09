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
    return this.prisma.$transaction(async (tx) => {
      // Toutes les autres sessions deviennent non par défaut
      await tx.sessions.updateMany({
        where: {
          ownerId: userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })

      // Création de la nouvelle session qui devient la session par défaut
      return tx.sessions.create({
        data: {
          ownerId: userId,
          name: dto.name,
          isDefault: true,
        },
        include: {
          owner: {
            select: {
              email: true,
            },
          },
        },
      })
    })
  }

  async findMine(userId: string) {
    return this.prisma.sessions.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId, invitationStatus: 'ACCEPTED' } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { email: true } },
        members: {
          select: {
            id: true, role: true, invitationStatus: true,
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
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
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        members: {
          select: {
            id: true,
            userId: true,
            invitedEmail: true,
            name: true,
            role: true,
            invitationStatus: true,
          },
        },
      },
    })
  }

  /// Définit une session comme par défaut si elle appartient à l'utilisateur
  /// Toutes les autres sessions de l'utilisateur deviennent non par défaut
  async setDefault(userId: string, sessionId: string) {
    // Vérifie que la session appartient bien à l'utilisateur
    const session = await this.prisma.sessions.findUnique({
      where: { id: sessionId },
    })

    if (!session) throw new NotFoundException('Session non trouvée')
    if (session.ownerId !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette session")
    }

    return this.prisma.$transaction([
      this.prisma.sessions.updateMany({
        where: { ownerId: userId },
        data: { isDefault: false },
      }),
      this.prisma.sessions.update({
        where: { id: sessionId },
        data: { isDefault: true },
      }),
    ])
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
