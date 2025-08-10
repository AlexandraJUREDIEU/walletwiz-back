import { IsEnum, IsInt, IsNumberString, IsOptional, IsString, Min, Max, IsBoolean } from 'class-validator'
import { ExpenseCategory } from '@prisma/client'

export class CreateExpenseDto {
  @IsString()
  sessionId: string

  @IsString()
  memberId: string

  @IsString()
  bankAccountId: string

  @IsString()
  label: string

  // Montant en string pour Decimal(18,2), ex: "89.90"
  @IsNumberString()
  amount: string

  // Jour de prélèvement prévu (1..31)
  @IsInt()
  @Min(1)
  @Max(31)
  day: number

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean
}