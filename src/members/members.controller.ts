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
import { MembersService } from './members.service'
import { CreateMemberDto } from './dto/create-member.dto'
import { UpdateMemberDto } from './dto/update-member.dto'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import { GetUser } from 'src/auth/get-user.decorator'

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@GetUser() user: any, @Body() dto: CreateMemberDto) {
    return this.membersService.create(user.userId, dto)
  }

  // 🔒 On protège aussi l’accès à la liste des membres d’une session
  @UseGuards(JwtAuthGuard)
  @Get('session/:sessionId')
  findAllBySession(@GetUser() user: any, @Param('sessionId') sessionId: string) {
    return this.membersService.findAllBySession(user.userId, sessionId)
  }

  // Lié à un lien public => laissé public (mais on n’expose plus le token dans la réponse)
  @Get('invite/:token')
  getByInviteToken(@Param('token') token: string) {
    return this.membersService.findByInviteToken(token)
  }

  @UseGuards(JwtAuthGuard)
  @Post('accept/:token')
  acceptInvite(@GetUser() user: any, @Param('token') token: string) {
    return this.membersService.acceptInvite(token, user.userId)
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@GetUser() user: any, @Param('id') id: string) {
    return this.membersService.findOne(user.userId, id)
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@GetUser() user: any, @Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(user.userId, id, dto)
  }

  // ✅ Endpoint dédié: changer de rôle (OWNER + COLLABORATOR autorisés)
  // - Seul OWNER peut nommer/déposer OWNER
  @UseGuards(JwtAuthGuard)
  @Patch(':id/role')
  changeRole(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() body: { role: 'OWNER' | 'COLLABORATOR' | 'VIEWER' },
  ) {
    return this.membersService.changeRole(user.userId, id, body.role)
  }

  // Invité décline via lien public
  @Post('decline/:token')
  declineInvite(@Param('token') token: string) {
    return this.membersService.declineInvite(token)
  }

  // Owner (ou manager) révoque une invitation
  @UseGuards(JwtAuthGuard)
  @Delete('invite/:id')
  revokeInvite(@GetUser() user: any, @Param('id') memberId: string) {
    return this.membersService.revokeInvite(memberId, user.userId)
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@GetUser() user: any, @Param('id') id: string) {
    return this.membersService.remove(user.userId, id)
  }
}