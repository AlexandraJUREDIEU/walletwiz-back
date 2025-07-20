import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SessionMembersService } from './session-members.service';
import { CreateSessionMemberDto } from './dto/create-session-member.dto';
import { UpdateSessionMemberDto } from './dto/update-session-member.dto';

@Controller('session-members')
export class SessionMembersController {
  constructor(private readonly sessionMembersService: SessionMembersService) {}

  @Post()
  create(@Body() createSessionMemberDto: CreateSessionMemberDto) {
    return this.sessionMembersService.create(createSessionMemberDto);
  }

  @Get()
  findAll() {
    return this.sessionMembersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionMembersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSessionMemberDto: UpdateSessionMemberDto) {
    return this.sessionMembersService.update(+id, updateSessionMemberDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sessionMembersService.remove(+id);
  }
}
