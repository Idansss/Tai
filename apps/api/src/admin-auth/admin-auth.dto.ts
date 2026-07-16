import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AdminLoginDto {
  @ApiProperty({ example: 'owner@example.com', maxLength: 320 })
  @Transform(trimString)
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ maxLength: 128, format: 'password' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class AdminMfaChallengeDto {
  @ApiProperty({ minLength: 43, maxLength: 43 })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  challengeToken!: string;
}

export class AdminMfaCodeDto extends AdminMfaChallengeDto {
  @ApiProperty({ pattern: '^\\d{6}$' })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class AdminRoleAssignmentDto {
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  expiresAt?: string | null;
}
