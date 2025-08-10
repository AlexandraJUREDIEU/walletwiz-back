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
import { ExpensesService } from './expenses.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import { GetUser } from 'src/auth/get-user.decorator'


@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // Lecture: tout membre de la session (owner/collab/viewer)
  @Get('session/:sessionId')
  findAllBySession(@GetUser() user: any, @Param('sessionId') sessionId: string) {
    return this.expensesService.findAllBySession(user.userId, sessionId)
  }

  // Création: owner/collab
  @Post()
  create(@GetUser() user: any, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.userId, dto)
  }

  // MAJ: owner/collab
  @Patch(':id')
  update(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(user.userId, id, dto)
  }

  // Suppression: owner/collab
  @Delete(':id')
  remove(@GetUser() user: any, @Param('id') id: string) {
    return this.expensesService.remove(user.userId, id)
  }
}
