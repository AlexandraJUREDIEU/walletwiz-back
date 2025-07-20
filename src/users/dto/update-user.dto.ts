import {
  IsOptional,
  IsString,
  IsIn,
  IsUrl,
  IsBoolean,
  IsDate,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsIn(['single', 'in couple', 'married'])
  status?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @IsOptional()
  @IsString()
  verificationCode?: string | null;

  @IsOptional()
  @IsDate()
  verificationCodeExpiresAt?: Date | null;
}
