import { IsString, IsNumberString, IsInt, Min, Max } from 'class-validator'

export class CreateIncomeDto {
  @IsString()
  sessionId: string

  @IsString()
  memberId: string

  @IsString()
  bankAccountId: string

  @IsString()
  label: string

  // Montant décimal sous forme de string, ex: "1200.50"
  @IsNumberString()
  amount: string

  // Jour prévu (1..31). On laisse 29-31, la logique calendrier peut venir plus tard.
  @IsInt()
  @Min(1)
  @Max(31)
  day: number
}