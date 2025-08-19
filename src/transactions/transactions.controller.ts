import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query,
} from '@nestjs/common'
import { TransactionsService } from './transactions.service'
import { CreateTransactionDto } from './dto/create-transaction.dto'
import { UpdateTransactionDto } from './dto/update-transaction.dto'
import { GetUser } from 'src/auth/get-user.decorator'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'


@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // Lister par session, avec filtres from/to (ISO)
  @Get('session/:sessionId')
  findAllBySession(
    @GetUser() user: any,
    @Param('sessionId') sessionId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.transactionsService.findAllBySession(user.userId, sessionId, from, to)
  }

  @Post()
  create(@GetUser() user: any, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(user.userId, dto)
  }

  @Patch(':id')
  update(@GetUser() user: any, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(user.userId, id, dto)
  }

  @Delete(':id')
  remove(@GetUser() user: any, @Param('id') id: string) {
    return this.transactionsService.remove(user.userId, id)
  }
}