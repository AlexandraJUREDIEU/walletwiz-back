import { Injectable } from '@nestjs/common';
import { CreateSessionMemberDto } from './dto/create-session-member.dto';
import { UpdateSessionMemberDto } from './dto/update-session-member.dto';

@Injectable()
export class SessionMembersService {
  create(createSessionMemberDto: CreateSessionMemberDto) {
    return 'This action adds a new sessionMember';
  }

  findAll() {
    return `This action returns all sessionMembers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sessionMember`;
  }

  update(id: number, updateSessionMemberDto: UpdateSessionMemberDto) {
    return `This action updates a #${id} sessionMember`;
  }

  remove(id: number) {
    return `This action removes a #${id} sessionMember`;
  }
}
