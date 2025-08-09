import { IsArray, IsOptional, IsString } from 'class-validator'

export class AddAccountMemberDto {
  // un seul membre
  @IsOptional()
  @IsString()
  memberId?: string

  // ou plusieurs
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[]
}