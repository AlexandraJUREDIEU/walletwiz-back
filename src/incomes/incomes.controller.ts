// src/incomes/incomes.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common'
import { IncomesService } from './incomes.service'
import { CreateIncomeDto } from './dto/create-income.dto'
import { UpdateIncomeDto } from './dto/update-income.dto'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import { GetUser } from 'src/auth/get-user.decorator'



@UseGuards(JwtAuthGuard)
@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  // Lister les revenus d’une session (OWNER/COLLABORATOR/VIEWER membres de la session)
  @Get('session/:sessionId')
  findAllBySession(@GetUser() user: any, @Param('sessionId') sessionId: string) {
    return this.incomesService.findAllBySession(user.userId, sessionId)
  }

  // Créer un revenu (OWNER/COLLABORATOR)
  @Post()
  create(@GetUser() user: any, @Body() dto: CreateIncomeDto) {
    return this.incomesService.create(user.userId, dto)
  }

  // Mettre à jour un revenu (OWNER/COLLABORATOR)
  @Patch(':id')
  update(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateIncomeDto,
  ) {
    return this.incomesService.update(user.userId, id, dto)
  }

  // Supprimer un revenu (OWNER/COLLABORATOR)
  @Delete(':id')
  remove(@GetUser() user: any, @Param('id') id: string) {
    return this.incomesService.remove(user.userId, id)
  }
}