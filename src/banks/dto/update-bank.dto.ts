import { IsBoolean, IsOptional, IsString, IsNumberString } from 'class-validator'

export class UpdateBankDto {
  @IsOptional()
  @IsString()
  label?: string

  @IsOptional()
  @IsString()
  bankName?: string

  @IsOptional()
  @IsNumberString()
  initialBalance?: string

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean
}