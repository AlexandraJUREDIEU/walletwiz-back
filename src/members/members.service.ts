import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import cuid from 'cuid'
import { UpdateMemberDto } from './dto/update-member.dto'
import { CreateMemberDto } from './dto/create-member.dto'
import { PrismaService } from 'src/prisma/prisma.service'

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  // Utilitaire: récupère le "rôle effectif" du demandeur dans la session
  private async getRequesterRole(sessionId: string, requesterUserId: string) {
    const session = await this.prisma.sessions.findUnique({
      where: { id: sessionId },
      select: { ownerId: true },
    })
    if (!session) throw new NotFoundException('Session introuvable')
    if (session.ownerId === requesterUserId) return 'OWNER'

    const me = await this.prisma.members.findFirst({
      where: { sessionId, userId: requesterUserId },
      select: { role: true },
    })
    return me?.role ?? null // null => pas membre de cette session
  }

  // 🔒 doit être OWNER (ou COLLABORATOR si allowCollaborator=true)
  private async assertCanManage(sessionId: string, requesterUserId: string, allowCollaborator = true) {
    const role = await this.getRequesterRole(sessionId, requesterUserId)
    if (role === 'OWNER') return
    if (allowCollaborator && role === 'COLLABORATOR') return
    throw new ForbiddenException("Droits insuffisants pour gérer les membres de cette session")
  }

  // Crée un membre (user existant, invité par email, ou placeholder)
  async create(requesterUserId: string, dto: CreateMemberDto) {
    // 1) session + droits (OWNER ou COLLABORATOR ? ici OWNER-only pour inviter/ajouter)
    const session = await this.prisma.sessions.findUnique({
      where: { id: dto.sessionId },
      select: { id: true, ownerId: true },
    })
    if (!session) throw new NotFoundException('Session introuvable')
    if (session.ownerId !== requesterUserId) {
      throw new ForbiddenException("Seul le propriétaire peut ajouter des membres")
    }

    // 2) doublon userId ?
    if (dto.userId) {
      const dup = await this.prisma.members.findFirst({
        where: { sessionId: dto.sessionId, userId: dto.userId },
        select: { id: true },
      })
      if (dup) throw new BadRequestException("Cet utilisateur est déjà membre de la session")
    }

    // 3) doublon placeholder (même name) ?
    if (!dto.userId && dto.name) {
      const sameName = await this.prisma.members.findFirst({
        where: { sessionId: dto.sessionId, name: dto.name, isPlaceholder: true },
        select: { id: true },
      })
      if (sameName) {
        throw new BadRequestException('Un membre fictif avec ce nom existe déjà dans cette session')
      }
    }

    // 4) doublon invitation (même email pending)
    if (!dto.userId && dto.invitedEmail) {
      const pending = await this.prisma.members.findFirst({
        where: {
          sessionId: dto.sessionId,
          invitedEmail: dto.invitedEmail,
          invitationStatus: 'PENDING',
        },
        select: { id: true },
      })
      if (pending) {
        throw new BadRequestException("Une invitation est déjà en attente pour cet email")
      }
      // BONUS: si un user avec cet email existe et est déjà membre
      const user = await this.prisma.users.findUnique({
        where: { email: dto.invitedEmail },
        select: { id: true },
      })
      if (user) {
        const already = await this.prisma.members.findFirst({
          where: { sessionId: dto.sessionId, userId: user.id },
          select: { id: true },
        })
        if (already) {
          throw new BadRequestException("Cet utilisateur est déjà membre de la session")
        }
      }
    }

    // 5) build data selon les 3 cas
    const data: any = {
      sessionId: dto.sessionId,
      role: dto.role || 'COLLABORATOR',
    }

    if (dto.userId) {
      data.userId = dto.userId
      data.invitationStatus = 'ACCEPTED'
    } else if (dto.invitedEmail) {
      data.invitedEmail = dto.invitedEmail
      data.inviteToken = cuid() // on génère le token
      data.invitedAt = new Date()
    } else if (dto.name) {
      data.name = dto.name
      data.isPlaceholder = true
      data.invitationStatus = 'ACCEPTED'
      data.acceptedAt = new Date()
    } else {
      throw new BadRequestException("Fournir 'userId' OU 'invitedEmail' OU 'name'")
    }

    // 6) create — expose inviteToken UNIQUEMENT si création via invitedEmail
    const created = await this.prisma.members.create({
      data,
      select: {
        id: true,
        sessionId: true,
        userId: true,
        name: true,
        role: true,
        isPlaceholder: true,
        invitationStatus: true,
        invitedEmail: true,
        invitedAt: true,
        acceptedAt: true,
        createdAt: true,
        updatedAt: true,
        // 👇 expose uniquement quand on a invité par email
        inviteToken: !!dto.invitedEmail,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })

    // Nettoyage: si inviteToken n’a pas été sélectionné (false), on enlève la clé
    if (!dto.invitedEmail) {
      // @ts-ignore
      delete created.inviteToken
    }

    return created
  }

  // 🔒 Liste des membres d’une session (visible aux membres de la session)
  async findAllBySession(requesterUserId: string, sessionId: string) {
    const role = await this.getRequesterRole(sessionId, requesterUserId)
    if (!role) throw new ForbiddenException("Accès refusé à cette session")

    return this.prisma.members.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sessionId: true,
        userId: true,
        name: true,
        role: true,
        isPlaceholder: true,
        invitationStatus: true,
        invitedEmail: true,
        invitedAt: true,
        acceptedAt: true,
        createdAt: true,
        updatedAt: true,
        // ❌ pas d'inviteToken
        user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })
  }

  // Public: récupérer via token — **sans** renvoyer le token
  async findByInviteToken(token: string) {
    const member = await this.prisma.members.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        sessionId: true,
        invitedEmail: true,
        invitationStatus: true,
        invitedAt: true,
        acceptedAt: true,
        createdAt: true,
        updatedAt: true,
        session: { select: { id: true, name: true } },
      },
    })
    if (!member) throw new NotFoundException('Invitation invalide ou expirée')
    return member
  }

  // 🔒 Détails d’un membre — accessible aux membres de la session
  async findOne(requesterUserId: string, id: string) {
    const member = await this.prisma.members.findUnique({
      where: { id },
      select: {
        id: true,
        sessionId: true,
        userId: true,
        name: true,
        role: true,
        isPlaceholder: true,
        invitationStatus: true,
        invitedEmail: true,
        invitedAt: true,
        acceptedAt: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })
    if (!member) throw new NotFoundException('Member not found')

    const role = await this.getRequesterRole(member.sessionId, requesterUserId)
    if (!role) throw new ForbiddenException("Accès refusé à cette session")
    return member
  }

  async acceptInvite(token: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.members.findUnique({ where: { inviteToken: token } })
      if (!invite) throw new NotFoundException('Invitation invalide ou expirée')

      if (invite.invitationStatus === 'ACCEPTED') {
        throw new BadRequestException('Cette invitation a déjà été acceptée')
      }

      const existing = await tx.members.findFirst({
        where: { sessionId: invite.sessionId, userId },
      })

      if (existing) {
        const updatedExisting = await tx.members.update({
          where: { id: existing.id },
          data: {
            invitationStatus: 'ACCEPTED',
            acceptedAt: existing.acceptedAt ?? new Date(),
            isPlaceholder: false,
          },
          select: {
            id: true, sessionId: true, userId: true, name: true, role: true,
            isPlaceholder: true, invitationStatus: true, invitedEmail: true,
            invitedAt: true, acceptedAt: true, createdAt: true, updatedAt: true,
            session: { select: { id: true, name: true } },
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        })
        await tx.members.delete({ where: { id: invite.id } })
        return updatedExisting
      }

      return tx.members.update({
        where: { id: invite.id },
        data: {
          userId,
          invitationStatus: 'ACCEPTED',
          acceptedAt: new Date(),
          isPlaceholder: false,
          inviteToken: null,
        },
        select: {
          id: true, sessionId: true, userId: true, name: true, role: true,
          isPlaceholder: true, invitationStatus: true, invitedEmail: true,
          invitedAt: true, acceptedAt: true, createdAt: true, updatedAt: true,
          session: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      })
    })
  }

  // 🔒 update générique (hors rôle) — OWNER ou COLLABORATOR
  async update(requesterUserId: string, id: string, dto: UpdateMemberDto) {
    const current = await this.prisma.members.findUnique({
      where: { id },
      select: { sessionId: true, role: true },
    })
    if (!current) throw new NotFoundException('Member not found')

    await this.assertCanManage(current.sessionId, requesterUserId, true)

    // On interdit le changement de rôle via update (route dédiée)
    const { role, ...rest } = dto

    // Si name change et placeholder, vérifier doublon
    if (rest.name) {
      const exists = await this.prisma.members.findFirst({
        where: { sessionId: current.sessionId, name: rest.name, isPlaceholder: true, NOT: { id } },
        select: { id: true },
      })
      if (exists) throw new BadRequestException('Un membre fictif avec ce nom existe déjà dans cette session')
    }

    return this.prisma.members.update({
      where: { id },
      data: rest,
      select: {
        id: true, sessionId: true, userId: true, name: true, role: true,
        isPlaceholder: true, invitationStatus: true, invitedEmail: true,
        invitedAt: true, acceptedAt: true, createdAt: true, updatedAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })
  }

  // 🔒 changer de rôle — OWNER ou COLLABORATOR; seul OWNER peut toucher OWNER
  async changeRole(requesterUserId: string, memberId: string, newRole: 'OWNER' | 'COLLABORATOR' | 'VIEWER') {
    const target = await this.prisma.members.findUnique({
      where: { id: memberId },
      select: { id: true, sessionId: true, role: true, userId: true },
    })
    if (!target) throw new NotFoundException('Member not found')

    const requesterRole = await this.getRequesterRole(target.sessionId, requesterUserId)
    if (!requesterRole) throw new ForbiddenException("Accès refusé à cette session")

    const requesterIsOwner = requesterRole === 'OWNER'
    const requesterIsCollaborator = requesterRole === 'COLLABORATOR'

    // Seuls OWNER/COLLABORATOR peuvent changer un rôle
    if (!(requesterIsOwner || requesterIsCollaborator)) {
      throw new ForbiddenException("Droits insuffisants pour changer le rôle")
    }

    // Seul OWNER peut nommer/déposer OWNER
    if (newRole === 'OWNER' || target.role === 'OWNER') {
      if (!requesterIsOwner) {
        throw new ForbiddenException("Seul le propriétaire peut modifier le rôle OWNER")
      }
    }

    return this.prisma.members.update({
      where: { id: memberId },
      data: { role: newRole },
      select: {
        id: true, sessionId: true, userId: true, name: true, role: true,
        isPlaceholder: true, invitationStatus: true, invitedEmail: true,
        invitedAt: true, acceptedAt: true, createdAt: true, updatedAt: true,
        user: { select: { id: true, email: true } },
      },
    })
  }

  async declineInvite(token: string) {
    const invite = await this.prisma.members.findUnique({ where: { inviteToken: token } })
    if (!invite) throw new NotFoundException('Invitation invalide ou expirée')
    if (invite.invitationStatus === 'ACCEPTED') {
      throw new BadRequestException("L'invitation a déjà été acceptée")
    }
    return this.prisma.members.update({
      where: { id: invite.id },
      data: { invitationStatus: 'DECLINED', inviteToken: null, acceptedAt: null, isPlaceholder: invite.isPlaceholder || false },
      select: {
        id: true, sessionId: true, userId: true, name: true, role: true,
        isPlaceholder: true, invitationStatus: true, invitedEmail: true,
        invitedAt: true, acceptedAt: true, createdAt: true, updatedAt: true,
      },
    })
  }

  // Owner ou Collaborator (manager) peut révoquer
  async revokeInvite(memberId: string, requesterUserId: string) {
    const invite = await this.prisma.members.findUnique({
      where: { id: memberId },
      include: { session: { select: { id: true, ownerId: true } } },
    })
    if (!invite) throw new NotFoundException('Invitation introuvable')

    // Autorisations: OWNER ou COLLABORATOR de la même session
    await this.assertCanManage(invite.session.id, requesterUserId, true)

    if (invite.invitationStatus === 'ACCEPTED' || invite.userId) {
      throw new BadRequestException("Impossible de révoquer: membre déjà rattaché")
    }

    await this.prisma.members.delete({ where: { id: memberId } })
    return { success: true }
  }

  async remove(requesterUserId: string, id: string) {
    const member = await this.prisma.members.findUnique({
      where: { id },
      select: { sessionId: true, role: true },
    })
    if (!member) throw new NotFoundException('Member not found')

    // Owner ou Collaborator peuvent retirer un membre;
    // (tu peux durcir à OWNER-only si tu veux)
    await this.assertCanManage(member.sessionId, requesterUserId, true)

    return this.prisma.members.delete({
      where: { id },
      select: { id: true, sessionId: true },
    })
  }
}