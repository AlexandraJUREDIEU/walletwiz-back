import { PartialType } from '@nestjs/mapped-types';
import { CreateSessionMemberDto } from './create-session-member.dto';

export class UpdateSessionMemberDto extends PartialType(
  CreateSessionMemberDto,
) {}
