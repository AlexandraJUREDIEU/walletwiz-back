import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateTransactionDto } from './dto/create-transaction.dto'
import { UpdateTransactionDto } from './dto/update-transaction.dto'

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  // ---- Auth helpers (même logique que Income/Expense/Budget)
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
      throw new ForbiddenException("Droits insuffisants pour gérer les transactions")
    }
  }

  // ---- Cohérence entities
  private async assertCoherence(sessionId: string, bankAccountId: string, memberId?: string) {
    const account = await this.prisma.bankAccounts.findUnique({
      where: { id: bankAccountId },
      select: { id: true, sessionId: true },
    })
    if (!account) throw new NotFoundException('Compte bancaire introuvable')
    if (account.sessionId !== sessionId) {
      throw new BadRequestException("bankAccountId n'appartient pas à cette session")
    }

    if (memberId) {
      const member = await this.prisma.members.findUnique({
        where: { id: memberId },
        select: { id: true, sessionId: true, invitationStatus: true },
      })
      if (!member) throw new NotFoundException('Membre introuvable')
      if (member.sessionId !== sessionId) {
        throw new BadRequestException("memberId n'appartient pas à cette session")
      }
      if (member.invitationStatus !== 'ACCEPTED') {
        throw new BadRequestException("Ce membre n'a pas encore rejoint la session (invitation non acceptée)")
      }
    }
  }

  // ---- Month <-> date (Europe/Paris)
  private monthKeyFromISO(dateISO: string) {
    const d = new Date(dateISO)
    // On “lit” la date en Europe/Paris pour construire YYYY-MM
    const y = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric' }).format(d)
    const m = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: '2-digit' }).format(d)
    return `${y}-${m}`
  }

  private async ensureBudget(sessionId: string, month: string) {
    // Upsert pour garantir l’attache budget (openingBalance = 0 si absent)
    const b = await this.prisma.budgets.upsert({
      where: { sessionId_month: { sessionId, month } },
      update: {},
      create: { sessionId, month, openingBalance: '0.00' },
      select: { id: true },
    })
    return b.id
  }

  // -------- LIST (par session, range date optionnel) --------
  async findAllBySession(userId: string, sessionId: string, from?: string, to?: string) {
    await this.assertSessionMember(sessionId, userId)

    const where: any = { sessionId }
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }

    return this.prisma.transactions.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        sessionId: true,
        bankAccountId: true,
        memberId: true,
        budgetId: true,
        type: true,
        label: true,
        amount: true,
        date: true,
        category: true,
        isCleared: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        bankAccount: { select: { id: true, label: true, bankName: true } },
        member: { select: { id: true, name: true, user: { select: { id: true, email: true } } } },
        budget: { select: { id: true, month: true } },
      },
    })
  }

  // -------- CREATE --------
  async create(userId: string, dto: CreateTransactionDto) {
    await this.assertCanManage(dto.sessionId, userId)
    await this.assertCoherence(dto.sessionId, dto.bankAccountId, dto.memberId)

    const month = this.monthKeyFromISO(dto.date)
    const budgetId = await this.ensureBudget(dto.sessionId, month)

    return this.prisma.transactions.create({
      data: {
        sessionId: dto.sessionId,
        bankAccountId: dto.bankAccountId,
        memberId: dto.memberId ?? null,
        budgetId,
        type: dto.type,
        label: dto.label,
        amount: dto.amount, // string -> Decimal OK
        date: new Date(dto.date),
        category: dto.category ?? null,
        isCleared: dto.isCleared ?? false,
        notes: dto.notes ?? null,
      },
      select: {
        id: true, sessionId: true, bankAccountId: true, memberId: true, budgetId: true,
        type: true, label: true, amount: true, date: true, category: true, isCleared: true, notes: true,
        createdAt: true, updatedAt: true,
      },
    })
  }

  // -------- UPDATE --------
  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const current = await this.prisma.transactions.findUnique({
      where: { id },
      select: {
        id: true, sessionId: true, bankAccountId: true, memberId: true, date: true, budgetId: true,
      },
    })
    if (!current) throw new NotFoundException('Transaction introuvable')

    await this.assertCanManage(current.sessionId, userId)

    // Si on change session/bankAccount/member → revalider la cohérence
    const nextSessionId = dto.sessionId ?? current.sessionId
    const nextBankId = dto.bankAccountId ?? current.bankAccountId
    const nextMemberId = dto.memberId ?? current.memberId ?? undefined

    if (dto.sessionId || dto.bankAccountId || dto.memberId) {
      await this.assertCoherence(nextSessionId, nextBankId, nextMemberId)
    }

    // Si on change la date ou la session → recalcul budgetId
    let nextBudgetId: string | undefined
    if (dto.date || dto.sessionId) {
      const month = this.monthKeyFromISO(dto.date ?? current.date.toISOString())
      nextBudgetId = await this.ensureBudget(nextSessionId, month)
    }

    return this.prisma.transactions.update({
      where: { id },
      data: {
        sessionId: dto.sessionId ?? undefined,
        bankAccountId: dto.bankAccountId ?? undefined,
        memberId: dto.memberId === undefined ? undefined : (dto.memberId ?? null),
        budgetId: nextBudgetId ?? undefined,
        type: dto.type ?? undefined,
        label: dto.label ?? undefined,
        amount: dto.amount ?? undefined,
        date: dto.date ? new Date(dto.date) : undefined,
        category: dto.category ?? undefined,
        isCleared: dto.isCleared ?? undefined,
        notes: dto.notes ?? undefined,
      },
      select: {
        id: true, sessionId: true, bankAccountId: true, memberId: true, budgetId: true,
        type: true, label: true, amount: true, date: true, category: true, isCleared: true, notes: true,
        createdAt: true, updatedAt: true,
      },
    })
  }

  // -------- DELETE --------
  async remove(userId: string, id: string) {
    const current = await this.prisma.transactions.findUnique({
      where: { id },
      select: { id: true, sessionId: true },
    })
    if (!current) throw new NotFoundException('Transaction introuvable')

    await this.assertCanManage(current.sessionId, userId)

    await this.prisma.transactions.delete({ where: { id } })
    return { success: true }
  }
}