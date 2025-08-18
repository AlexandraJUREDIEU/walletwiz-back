import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common'
import { BudgetsService } from './budgets.service'
import { CreateBudgetDto } from './dto/create-budget.dto'
import { UpdateBudgetDto } from './dto/update-budget.dto'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import { GetUser } from 'src/auth/get-user.decorator'

@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  // Lister tous les budgets d’une session (option: filtrer par month via ?month=YYYY-MM)
  @Get('session/:sessionId')
  findAllBySession(
    @GetUser() user: any,
    @Param('sessionId') sessionId: string,
    @Query('month') month?: string,
  ) {
    return this.budgetsService.findAllBySession(user.userId, sessionId, month)
  }

  // Créer un budget (OWNER/COLLABORATOR)
  @Post()
  create(@GetUser() user: any, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(user.userId, dto)
  }

  // Mettre à jour un budget (respecte locked)
  @Patch(':id')
  update(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(user.userId, id, dto)
  }

  // Supprimer un budget (interdit si locked)
  @Delete(':id')
  remove(@GetUser() user: any, @Param('id') id: string) {
    return this.budgetsService.remove(user.userId, id)
  }

  // Résumé du mois donné (MVP : openingBalance + incomes/expenses planifiés)
  @Get('session/:sessionId/:month/summary')
  summary(
    @GetUser() user: any,
    @Param('sessionId') sessionId: string,
    @Param('month') month: string,
  ) {
    return this.budgetsService.getSummary(user.userId, sessionId, month)
  }

  // Résumé du mois courant (Europe/Paris). Option: ?createIfMissing=true pour auto-créer le budget.
  @Get('session/:sessionId/current/summary')
  currentSummary(
    @GetUser() user: any,
    @Param('sessionId') sessionId: string,
    @Query('createIfMissing') createIfMissing?: string,
  ) {
    return this.budgetsService.getCurrentSummary(
      user.userId,
      sessionId,
      createIfMissing === 'true',
    )
    }
}