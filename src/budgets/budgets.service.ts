import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateBudgetDto } from './dto/create-budget.dto'
import { UpdateBudgetDto } from './dto/update-budget.dto'
import { Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  // ---- utils accès session ----
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
      throw new ForbiddenException("Droits insuffisants pour gérer les budgets")
    }
  }

  // ---- LIST ----
  async findAllBySession(requesterUserId: string, sessionId: string, month?: string) {
    await this.assertSessionMember(sessionId, requesterUserId)
    return this.prisma.budgets.findMany({
      where: { sessionId, ...(month ? { month } : {}) },
      orderBy: [{ month: 'desc' }],
      select: {
        id: true, sessionId: true, month: true, openingBalance: true,
        notes: true, locked: true, createdAt: true, updatedAt: true,
      },
    })
  }

  // ---- CREATE ----
  async create(requesterUserId: string, dto: CreateBudgetDto) {
    await this.assertCanManage(dto.sessionId, requesterUserId)
    try {
      return await this.prisma.budgets.create({
        data: {
          sessionId: dto.sessionId,
          month: dto.month,
          openingBalance: dto.openingBalance ?? undefined, // string OK pour Decimal
          notes: dto.notes ?? undefined,
          locked: dto.locked ?? false,
        },
        select: {
          id: true, sessionId: true, month: true, openingBalance: true,
          notes: true, locked: true, createdAt: true, updatedAt: true,
        },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Un budget existe déjà pour ce mois')
      }
      throw e
    }
  }

  // ---- UPDATE ----
  async update(requesterUserId: string, id: string, dto: UpdateBudgetDto) {
    const current = await this.prisma.budgets.findUnique({
      where: { id },
      select: { id: true, sessionId: true, locked: true },
    })
    if (!current) throw new NotFoundException('Budget introuvable')

    await this.assertCanManage(current.sessionId, requesterUserId)

    // Si verrouillé, on n’autorise que { locked: false }
    if (current.locked) {
      const onlyUnlock = Object.keys(dto).length === 1 && dto.locked === false
      if (!onlyUnlock) throw new ForbiddenException('Budget verrouillé: déverrouillez avant modification')
    }

    try {
      return await this.prisma.budgets.update({
        where: { id },
        data: {
          month: dto.month ?? undefined,
          openingBalance: dto.openingBalance ?? undefined,
          notes: dto.notes ?? undefined,
          locked: dto.locked ?? undefined,
        },
        select: {
          id: true, sessionId: true, month: true, openingBalance: true,
          notes: true, locked: true, createdAt: true, updatedAt: true,
        },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Un budget existe déjà pour ce mois')
      }
      throw e
    }
  }

  // ---- DELETE ----
  async remove(requesterUserId: string, id: string) {
    const current = await this.prisma.budgets.findUnique({
      where: { id },
      select: { id: true, sessionId: true, locked: true },
    })
    if (!current) throw new NotFoundException('Budget introuvable')
    await this.assertCanManage(current.sessionId, requesterUserId)
    if (current.locked) throw new ForbiddenException('Budget verrouillé: impossible de supprimer')

    await this.prisma.budgets.delete({ where: { id } })
    return { success: true }
  }

  // ---- SUMMARY (MVP sans transactions) ----
  async getSummary(requesterUserId: string, sessionId: string, month: string) {
    await this.assertSessionMember(sessionId, requesterUserId)

    const budget = await this.prisma.budgets.findUnique({
      where: { sessionId_month: { sessionId, month } },
      select: { id: true, openingBalance: true, notes: true, locked: true, month: true },
    })

    const [inc, exp] = await Promise.all([
      this.prisma.incomes.aggregate({ _sum: { amount: true }, where: { sessionId } }),
      this.prisma.expenses.aggregate({ _sum: { amount: true }, where: { sessionId, isArchived: false } }),
    ])

    const opening = new Decimal(budget?.openingBalance ?? 0)
    const plannedIncome = new Decimal(inc._sum.amount ?? 0)
    const plannedExpense = new Decimal(exp._sum.amount ?? 0)
    const netPlanned = plannedIncome.minus(plannedExpense)
    const projectedEndBalance = opening.plus(netPlanned)

    return {
      sessionId,
      month,
      budget: budget ?? null,
      openingBalance: opening.toFixed(2),
      plannedIncome: plannedIncome.toFixed(2),
      plannedExpense: plannedExpense.toFixed(2),
      netPlanned: netPlanned.toFixed(2),
      projectedEndBalance: projectedEndBalance.toFixed(2),
      // placeholders pour Transactions (plus tard)
      actualInflow: '0.00',
      actualOutflow: '0.00',
      netActual: '0.00',
      endingBalance: opening.toFixed(2),
    }
  }

  async getCurrentSummary(requesterUserId: string, sessionId: string, createIfMissing: boolean) {
    // Mois courant (Europe/Paris)
    const d = new Date()
    const y = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric' }).format(d)
    const m = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: '2-digit' }).format(d)
    const month = `${y}-${m}`

    if (createIfMissing) {
      await this.prisma.budgets.upsert({
        where: { sessionId_month: { sessionId, month } },
        update: {},
        create: { sessionId, month, openingBalance: '0.00' },
      })
    }
    return this.getSummary(requesterUserId, sessionId, month)
  }
}