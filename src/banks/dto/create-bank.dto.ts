import { IsArray, IsBoolean, IsOptional, IsString, IsNumberString } from 'class-validator'

export class CreateBankDto {
  @IsString()
  sessionId: string

  @IsString()
  label: string

  @IsString()
  bankName: string

  // On accepte une chaîne "123.45" (recommandé) ou un nombre converti en string par le client
  @IsOptional()
  @IsNumberString()
  initialBalance?: string

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean

  // Optionnel: rattacher des membres existants au compte à la création
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[]
}