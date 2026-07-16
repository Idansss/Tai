import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RegisterCustomerDto {
  @ApiProperty({ example: 'customer@example.com', maxLength: 320 })
  @Transform(trimString)
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ minLength: 12, maxLength: 128, format: 'password' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;
}

export class LoginCustomerDto {
  @ApiProperty({ example: 'customer@example.com', maxLength: 320 })
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

export class AuthEmailDto {
  @ApiProperty({ example: 'customer@example.com', maxLength: 320 })
  @Transform(trimString)
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

export class AuthTokenDto {
  @ApiProperty({ minLength: 43, maxLength: 43 })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token!: string;
}

export class ConfirmPasswordResetDto extends AuthTokenDto {
  @ApiProperty({ minLength: 12, maxLength: 128, format: 'password' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
