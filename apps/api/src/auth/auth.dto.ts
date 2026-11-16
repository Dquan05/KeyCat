import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  username!: string;

  @IsString()
  password!: string;
}

export class EmailDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;
}

export class TokenDto {
  @IsString()
  @Matches(/^[0-9a-f]{64}$/i)
  token!: string;
}

export class LoginDto extends EmailDto {
  @IsString()
  password!: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsString()
  newPassword!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  newPassword!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(['vi', 'en'])
  uiLanguage?: string;

  @IsOptional()
  @IsIn(['light', 'dark'])
  theme?: string;

  @IsOptional()
  @IsIn(['monospace', 'sans-serif'])
  typingFont?: string;

  @IsOptional()
  @IsInt()
  @Min(16)
  @Max(36)
  fontSize?: number;

  @IsOptional()
  @IsBoolean()
  showKeyboard?: boolean;

  @IsOptional()
  @IsBoolean()
  showHands?: boolean;

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;
}
