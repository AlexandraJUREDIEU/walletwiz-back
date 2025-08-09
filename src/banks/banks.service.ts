import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateBankDto } from './dto/create-bank.dto'
import { UpdateBankDto } from './dto/update-bank.dto'
import { AddAccountMemberDto } from './dto/add-account-member.dto'


@Injectable()
export class BanksService {
  constructor(private prisma: PrismaService) {}

  // ---- Utils très simples ----
  private async assertSessionMember(sessionId: string, userId: string) {
    const session = await this.prisma.sessions.findUnique({
      where: { id: sessionId },
      select: { ownerId: true },
    })
    if (!session) throw new NotFoundException('Session introuvable')
    if (session.ownerId === userId) return 'OWNER'

    const me = await this.prisma.members.findFirst({
      where: { sessionId, userId, invitationStatus: 'ACCEPTED' },
      select: { role: true },
    })
    if (!me) throw new ForbiddenException("Accès refusé à cette session")
    return me.role // 'COLLABORATOR' | 'VIEWER'
  }

  private async assertCanManage(sessionId: string, userId: string) {
    const role = await this.assertSessionMember(sessionId, userId)
    if (role === 'VIEWER') {
      throw new ForbiddenException("Droits insuffisants pour gérer les comptes")
    }
  }

  // ---- LIST ----
  async findAllBySession(requesterUserId: string, sessionId: string) {
    await this.assertSessionMember(sessionId, requesterUserId)

    return this.prisma.bankAccounts.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        bankName: true,
        sessionId: true,
        initialBalance: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
        // membres du compte (pivot + info de base du member)
        members: {
          select: {
            memberId: true,
            member: {
              select: {
                id: true,
                name: true,
                role: true,
                isPlaceholder: true,
                invitationStatus: true,
                user: { select: { id: true, email: true } },
              },
            },
          },
        },
      },
    })
  }

  // ---- CREATE ----
  async create(requesterUserId: string, dto: CreateBankDto) {
    // Droits
    await this.assertCanManage(dto.sessionId, requesterUserId)

    // Vérifier que les memberIds appartiennent bien à la session
    const memberIds = dto.memberIds ?? []
    if (memberIds.length) {
      const found = await this.prisma.members.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, sessionId: true },
      })
      if (found.length !== memberIds.length || found.some(m => m.sessionId !== dto.sessionId)) {
        throw new BadRequestException("Certains 'memberIds' ne sont pas dans cette session")
      }
    }

    // Créer le compte
    const account = await this.prisma.bankAccounts.create({
      data: {
        sessionId: dto.sessionId,
        label: dto.label,
        bankName: dto.bankName,
        initialBalance: dto.initialBalance ?? '0',
        isArchived: dto.isArchived ?? false,
      },
      select: {
        id: true, label: true, bankName: true, sessionId: true,
        initialBalance: true, isArchived: true, createdAt: true, updatedAt: true,
      },
    })

    // Rattacher les membres si fournis
    if (memberIds.length) {
      await this.prisma.bankAccountMembers.createMany({
        data: memberIds.map(memberId => ({ bankAccountId: account.id, memberId })),
        skipDuplicates: true,
      })
    }

    // Retour final (avec membres)
    return this.prisma.bankAccounts.findUnique({
      where: { id: account.id },
      select: {
        id: true, label: true, bankName: true, sessionId: true,
        initialBalance: true, isArchived: true, createdAt: true, updatedAt: true,
        members: {
          select: {
            memberId: true,
            member: {
              select: {
                id: true, name: true, role: true, isPlaceholder: true,
                invitationStatus: true,
                user: { select: { id: true, email: true } },
              },
            },
          },
        },
      },
    })
  }

  // ---- UPDATE ----
  async update(requesterUserId: string, bankAccountId: string, dto: UpdateBankDto) {
    const account = await this.prisma.bankAccounts.findUnique({
      where: { id: bankAccountId },
      select: { id: true, sessionId: true },
    })
    if (!account) throw new NotFoundException('Compte introuvable')

    await this.assertCanManage(account.sessionId, requesterUserId)

    return this.prisma.bankAccounts.update({
      where: { id: bankAccountId },
      data: {
        label: dto.label ?? undefined,
        bankName: dto.bankName ?? undefined,
        initialBalance: dto.initialBalance ?? undefined,
        isArchived: dto.isArchived ?? undefined,
      },
      select: {
        id: true, label: true, bankName: true, sessionId: true,
        initialBalance: true, isArchived: true, createdAt: true, updatedAt: true,
      },
    })
  }

  // ---- DELETE ----
  async remove(requesterUserId: string, bankAccountId: string) {
    const account = await this.prisma.bankAccounts.findUnique({
      where: { id: bankAccountId },
      select: { id: true, sessionId: true },
    })
    if (!account) throw new NotFoundException('Compte introuvable')

    await this.assertCanManage(account.sessionId, requesterUserId)

    await this.prisma.bankAccounts.delete({ where: { id: bankAccountId } })
    return { success: true }
  }

  // ---- ADD MEMBERS ----
  async addMembers(requesterUserId: string, bankAccountId: string, dto: AddAccountMemberDto) {
    const account = await this.prisma.bankAccounts.findUnique({
      where: { id: bankAccountId },
      select: { id: true, sessionId: true },
    })
    if (!account) throw new NotFoundException('Compte introuvable')

    await this.assertCanManage(account.sessionId, requesterUserId)

    const ids = dto.memberIds?.length ? dto.memberIds : (dto.memberId ? [dto.memberId] : [])
    if (!ids.length) throw new BadRequestException("Fournir 'memberId' ou 'memberIds'")

    // Vérifier que chaque memberId appartient à la même session
    const members = await this.prisma.members.findMany({
      where: { id: { in: ids } },
      select: { id: true, sessionId: true },
    })
    if (members.length !== ids.length || members.some(m => m.sessionId !== account.sessionId)) {
      throw new BadRequestException("Certains 'memberId(s)' ne sont pas dans cette session")
    }

    await this.prisma.bankAccountMembers.createMany({
      data: ids.map(memberId => ({ bankAccountId, memberId })),
      skipDuplicates: true,
    })

    return { success: true }
  }

  // ---- REMOVE MEMBER ----
  async removeMember(requesterUserId: string, bankAccountId: string, memberId: string) {
    const account = await this.prisma.bankAccounts.findUnique({
      where: { id: bankAccountId },
      select: { id: true, sessionId: true },
    })
    if (!account) throw new NotFoundException('Compte introuvable')

    await this.assertCanManage(account.sessionId, requesterUserId)

    // Le lien existe ?
    const pivot = await this.prisma.bankAccountMembers.findUnique({
      where: { bankAccountId_memberId: { bankAccountId, memberId } },
      select: { bankAccountId: true },
    })
    if (!pivot) throw new NotFoundException('Ce membre ne figure pas sur ce compte')

    // Supprimer le lien
    await this.prisma.bankAccountMembers.delete({
      where: { bankAccountId_memberId: { bankAccountId, memberId } },
    })

    // S’il n’y a plus aucun membre, supprimer le compte
    const remaining = await this.prisma.bankAccountMembers.count({ where: { bankAccountId } })
    if (remaining === 0) {
      await this.prisma.bankAccounts.delete({ where: { id: bankAccountId } })
      return { success: true, accountDeleted: true }
    }

    return { success: true, accountDeleted: false }
  }
}
