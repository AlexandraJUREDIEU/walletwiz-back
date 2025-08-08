import { IsOptional, IsString, IsEnum, IsUUID, IsEmail } from 'class-validator'
import { MemberRole } from '@prisma/client'

export class CreateMemberDto {
  @IsString()
  sessionId: string

  @IsOptional()
  @IsUUID()
  userId?: string

  @IsOptional()
  @IsEmail()
  invitedEmail?: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole
}