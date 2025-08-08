import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateMemberDto } from './dto/create-member.dto'
import { UpdateMemberDto } from './dto/update-member.dto'
import cuid from 'cuid'

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  // Crée un nouveau membre pour une session
  /// Si userId est fourni, le membre est lié à un utilisateur existant
  /// Si invitedEmail est fourni, un email d'invitation est envoyé
  /// Si name est fourni, un membre temporaire est créé sans utilisateur
  async create(requesterUserId: string, dto: CreateMemberDto) {
    // 1) session existe ?
    const session = await this.prisma.sessions.findUnique({
      where: { id: dto.sessionId },
      select: { id: true, ownerId: true },
    })
    if (!session) throw new NotFoundException('Session introuvable')

    // 2) droits : OWNER only (changeable si tu veux)
    const isOwner = session.ownerId === requesterUserId
    if (!isOwner) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à ajouter des membres à cette session")
    }

    // 3) éviter doublon si userId fourni
    if (dto.userId) {
      const dup = await this.prisma.members.findFirst({
        where: { sessionId: dto.sessionId, userId: dto.userId },
        select: { id: true },
      })
      if (dup) throw new BadRequestException("Cet utilisateur est déjà membre de la session")
    }

    // 4) build data selon les 3 cas
    const data: any = {
      sessionId: dto.sessionId,
      role: dto.role || 'COLLABORATOR',
    }

    if (dto.userId) {
      data.userId = dto.userId
      data.invitationStatus = 'ACCEPTED'
    } else if (dto.invitedEmail) {
      data.invitedEmail = dto.invitedEmail
      data.inviteToken = cuid()
      data.invitedAt = new Date()
    } else if (dto.name) {
      data.name = dto.name
      data.isPlaceholder = true
    } else {
      throw new BadRequestException("Fournir 'userId' OU 'invitedEmail' OU 'name'")
    }

    return this.prisma.members.create({
      data,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })
  }

  async findByInviteToken(token: string) {
    const member = await this.prisma.members.findUnique({
      where: { inviteToken: token },
      include: {
        session: {
          select: { id: true, name: true },
        },
      },
    })

    if (!member) {
      throw new NotFoundException('Invitation invalide ou expirée')
    }

    return member
  }

  async findAllBySession(sessionId: string) {
    return this.prisma.members.findMany({
      where: { sessionId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    })
  }

  /// Récupère un membre par son ID
  async findOne(id: string) {
    const member = await this.prisma.members.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    })
    if (!member) throw new NotFoundException('Member not found')
    return member
  }

  /// Accepte une invitation à rejoindre une session
  /// Vérifie si l'invitation est valide et n'a pas déjà été acceptée.
  async acceptInvite(token: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.members.findUnique({ where: { inviteToken: token } })
      if (!invite) throw new NotFoundException('Invitation invalide ou expirée')

      // déjà acceptée ?
      if (invite.invitationStatus === 'ACCEPTED') {
        throw new BadRequestException('Cette invitation a déjà été acceptée')
      }

      // user déjà membre de la même session ?
      const existing = await tx.members.findFirst({
        where: { sessionId: invite.sessionId, userId },
      })

      if (existing) {
        // 1) on met à jour le membre existant (au cas où il n’aurait pas d’acceptedAt)
        const updatedExisting = await tx.members.update({
          where: { id: existing.id },
          data: {
            invitationStatus: 'ACCEPTED',
            acceptedAt: existing.acceptedAt ?? new Date(),
            isPlaceholder: false,
          },
          include: {
            session: { select: { id: true, name: true } },
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        })
        // 2) on supprime la ligne d’invitation
        await tx.members.delete({ where: { id: invite.id } })
        return updatedExisting
      }

      // chemin normal : rattacher le user à la ligne d’invitation
      return tx.members.update({
        where: { id: invite.id },
        data: {
          userId,
          invitationStatus: 'ACCEPTED',
          acceptedAt: new Date(),
          isPlaceholder: false,
          inviteToken: null,
        },
        include: {
          session: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      })
    })
  }

  /// Met à jour un membre existant
  async update(id: string, dto: UpdateMemberDto) {
    return this.prisma.members.update({
      where: { id },
      data: dto,
    })
  }

  // L’invité clique sur "Refuser" depuis le lien (pas besoin d’être connecté)
  async declineInvite(token: string) {
    const invite = await this.prisma.members.findUnique({
      where: { inviteToken: token },
    })
    if (!invite) throw new NotFoundException('Invitation invalide ou expirée')

    if (invite.invitationStatus === 'ACCEPTED') {
      throw new BadRequestException("L'invitation a déjà été acceptée")
    }

    // On invalide le token pour empêcher une acceptation ultérieure
    return this.prisma.members.update({
      where: { id: invite.id },
      data: {
        invitationStatus: 'DECLINED',
        inviteToken: null,
        acceptedAt: null,
        isPlaceholder: invite.isPlaceholder || false,
      },
    })
  }

  // Le propriétaire révoque (supprime) une invitation encore en attente
  async revokeInvite(memberId: string, ownerUserId: string) {
    const invite = await this.prisma.members.findUnique({
      where: { id: memberId },
      include: { session: { select: { ownerId: true } } },
    })
    if (!invite) throw new NotFoundException('Invitation introuvable')

    // Sécurité: seul le propriétaire de la session peut révoquer
    if (invite.session.ownerId !== ownerUserId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à révoquer cette invitation")
    }

    // On ne révoque que les invitations (pas un membre déjà accepté/lié à un user)
    if (invite.invitationStatus === 'ACCEPTED' || invite.userId) {
      throw new BadRequestException("Impossible de révoquer: membre déjà rattaché")
    }

    // Suppression pure et simple de la ligne d’invitation
    await this.prisma.members.delete({ where: { id: memberId } })
    return { success: true }
  }
  /// Supprime un membre par son ID
  async remove(id: string) {
    return this.prisma.members.delete({
      where: { id },
    })
  }
}
