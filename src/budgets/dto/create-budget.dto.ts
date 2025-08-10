import { IsBoolean, IsNumberString, IsOptional, IsString, Matches } from 'class-validator'

export class CreateBudgetDto {
  @IsString()
  sessionId: string

  // Format YYYY-MM (01..12)
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month doit être au format YYYY-MM' })
  month: string

  // Decimal en string, ex: "500.00"
  @IsOptional()
  @IsNumberString()
  openingBalance?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsBoolean()
  locked?: boolean
}