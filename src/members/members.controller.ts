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

  @Get('session/:sessionId')
  findAllBySession(@Param('sessionId') sessionId: string) {
    return this.membersService.findAllBySession(sessionId)
  }

  @Get('invite/:token')
  getByInviteToken(@Param('token') token: string) {
    return this.membersService.findByInviteToken(token)
  }

  @UseGuards(JwtAuthGuard)
  @Post('accept/:token')
  acceptInvite(@GetUser() user: any, @Param('token') token: string) {
    return this.membersService.acceptInvite(token, user.userId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto)
  }

  // Invité décline via son lien
  @Post('decline/:token')
  declineInvite(@Param('token') token: string) {
    return this.membersService.declineInvite(token)
  }

  // Owner révoque (supprime) une invitation pending (auth requis)
  @UseGuards(JwtAuthGuard)
  @Delete('invite/:id')
  revokeInvite(@GetUser() user: any, @Param('id') memberId: string) {
    return this.membersService.revokeInvite(memberId, user.userId)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.membersService.remove(id)
  }
}