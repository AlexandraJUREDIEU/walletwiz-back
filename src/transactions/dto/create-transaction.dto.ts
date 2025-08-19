import { IsBoolean, IsEnum, IsISO8601, IsNumberString, IsOptional, IsString } from 'class-validator'
import { ExpenseCategory, TransactionType } from '@prisma/client'

export class CreateTransactionDto {
  @IsString()
  sessionId: string

  @IsString()
  bankAccountId: string

  @IsOptional()
  @IsString()
  memberId?: string

  @IsEnum(TransactionType)
  type: TransactionType // 'INFLOW' | 'OUTFLOW'

  @IsString()
  label: string

  // Decimal en string, ex: "123.45"
  @IsNumberString()
  amount: string

  // Date de l’opération (ISO, ex: "2025-09-05" ou "2025-09-05T10:30:00Z")
  @IsISO8601()
  date: string

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory

  @IsOptional()
  @IsBoolean()
  isCleared?: boolean

  @IsOptional()
  @IsString()
  notes?: string
}