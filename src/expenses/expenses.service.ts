import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
  import { UpdateExpenseDto } from './dto/update-expense.dto'
import { Prisma } from '@prisma/client'

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  // --- Utils: rôle du demandeur ---
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
      throw new ForbiddenException("Droits insuffisants pour gérer les dépenses")
    }
  }

  // --- Vérifs d'intégrité pour (sessionId, memberId, bankAccountId) ---
  private async assertCoherence(sessionId: string, memberId: string, bankAccountId: string) {
    const [member, account] = await Promise.all([
      this.prisma.members.findUnique({
        where: { id: memberId },
        select: { id: true, sessionId: true, invitationStatus: true },
      }),
      this.prisma.bankAccounts.findUnique({
        where: { id: bankAccountId },
        select: { id: true, sessionId: true },
      }),
    ])

    if (!member) throw new NotFoundException('Membre introuvable')
    if (!account) throw new NotFoundException('Compte bancaire introuvable')
    if (member.sessionId !== sessionId) {
      throw new BadRequestException("memberId n'appartient pas à cette session")
    }
    if (account.sessionId !== sessionId) {
      throw new BadRequestException("bankAccountId n'appartient pas à cette session")
    }
    if (member.invitationStatus !== 'ACCEPTED') {
      throw new BadRequestException("Ce membre n'a pas encore rejoint la session (invitation non acceptée)")
    }
  }

  // -------- LIST --------
  async findAllBySession(requesterUserId: string, sessionId: string) {
    await this.assertSessionMember(sessionId, requesterUserId)

    return this.prisma.expenses.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        amount: true,
        day: true,
        category: true,
        isArchived: true,
        sessionId: true,
        memberId: true,
        bankAccountId: true,
        createdAt: true,
        updatedAt: true,
        member: {
          select: {
            id: true,
            name: true,
            role: true,
            user: { select: { id: true, email: true } },
          },
        },
        bankAccount: {
          select: { id: true, label: true, bankName: true },
        },
      },
    })
  }

  // -------- CREATE --------
  async create(requesterUserId: string, dto: CreateExpenseDto) {
    await this.assertCanManage(dto.sessionId, requesterUserId)
    await this.assertCoherence(dto.sessionId, dto.memberId, dto.bankAccountId)

    try {
      return await this.prisma.expenses.create({
        data: {
          sessionId: dto.sessionId,
          memberId: dto.memberId,
          bankAccountId: dto.bankAccountId,
          label: dto.label,
          amount: dto.amount, // string -> Decimal OK
          day: dto.day,
          category: dto.category,
          isArchived: dto.isArchived ?? false,
        },
        select: {
          id: true,
          label: true,
          amount: true,
          day: true,
          category: true,
          isArchived: true,
          sessionId: true,
          memberId: true,
          bankAccountId: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // @@unique([sessionId, label, day, amount])
        throw new BadRequestException('Dépense en double (même label, jour et montant) dans cette session')
      }
      throw e
    }
  }

  // -------- UPDATE --------
  async update(requesterUserId: string, expenseId: string, dto: UpdateExpenseDto) {
    const current = await this.prisma.expenses.findUnique({
      where: { id: expenseId },
      select: { id: true, sessionId: true, memberId: true, bankAccountId: true },
    })
    if (!current) throw new NotFoundException('Dépense introuvable')

    await this.assertCanManage(current.sessionId, requesterUserId)

    const nextSessionId = dto.sessionId ?? current.sessionId
    const nextMemberId = dto.memberId ?? current.memberId
    const nextBankId = dto.bankAccountId ?? current.bankAccountId

    if (
      dto.sessionId !== undefined ||
      dto.memberId !== undefined ||
      dto.bankAccountId !== undefined
    ) {
      await this.assertCoherence(nextSessionId, nextMemberId, nextBankId)
    }

    try {
      return await this.prisma.expenses.update({
        where: { id: expenseId },
        data: {
          sessionId: dto.sessionId ?? undefined,
          memberId: dto.memberId ?? undefined,
          bankAccountId: dto.bankAccountId ?? undefined,
          label: dto.label ?? undefined,
          amount: dto.amount ?? undefined,
          day: dto.day ?? undefined,
          category: dto.category ?? undefined,
          isArchived: dto.isArchived ?? undefined,
        },
        select: {
          id: true,
          label: true,
          amount: true,
          day: true,
          category: true,
          isArchived: true,
          sessionId: true,
          memberId: true,
          bankAccountId: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Dépense en double (même label, jour et montant) dans cette session')
      }
      throw e
    }
  }

  // -------- DELETE --------
  async remove(requesterUserId: string, expenseId: string) {
    const current = await this.prisma.expenses.findUnique({
      where: { id: expenseId },
      select: { id: true, sessionId: true },
    })
    if (!current) throw new NotFoundException('Dépense introuvable')

    await this.assertCanManage(current.sessionId, requesterUserId)

    await this.prisma.expenses.delete({ where: { id: expenseId } })
    return { success: true }
  }
}