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
import { BanksService } from './banks.service'
import { CreateBankDto } from './dto/create-bank.dto'
import { UpdateBankDto } from './dto/update-bank.dto'
import { AddAccountMemberDto } from './dto/add-account-member.dto'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import { GetUser } from 'src/auth/get-user.decorator'

@UseGuards(JwtAuthGuard)
@Controller('bank-accounts')
export class BanksController {
  constructor(private readonly bankAccountsService: BanksService) {}

  // Lister les comptes d’une session (OWNER/COLLABORATOR/VIEWER appartenant à la session)
  @Get('session/:sessionId')
  findAllBySession(@GetUser() user: any, @Param('sessionId') sessionId: string) {
    return this.bankAccountsService.findAllBySession(user.userId, sessionId)
  }

  // Créer un compte (OWNER/COLLABORATOR)
  @Post()
  create(@GetUser() user: any, @Body() dto: CreateBankDto) {
    return this.bankAccountsService.create(user.userId, dto)
  }

  // Mettre à jour un compte (OWNER/COLLABORATOR)
  @Patch(':id')
  update(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateBankDto,
  ) {
    return this.bankAccountsService.update(user.userId, id, dto)
  }

  // Supprimer un compte (OWNER/COLLABORATOR)
  @Delete(':id')
  remove(@GetUser() user: any, @Param('id') id: string) {
    return this.bankAccountsService.remove(user.userId, id)
  }

  // Ajouter un ou plusieurs membres au compte (OWNER/COLLABORATOR)
  @Post(':id/members')
  addMembers(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddAccountMemberDto,
  ) {
    return this.bankAccountsService.addMembers(user.userId, id, dto)
  }

  // Retirer un membre du compte (OWNER/COLLABORATOR)
  @Delete(':id/members/:memberId')
  removeMember(
    @GetUser() user: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.bankAccountsService.removeMember(user.userId, id, memberId)
  }
}