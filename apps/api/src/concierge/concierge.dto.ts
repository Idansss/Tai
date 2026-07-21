import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  category!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4_000)
  customerMessage!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  aiContextSummary!: string;

  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const)
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  conversationPublicId?: string;
}

export class UpsertKnowledgeDto {
  @IsString()
  @MaxLength(32)
  sourceType!: string;

  @IsString()
  @MaxLength(200)
  sourceId!: string;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsString()
  @MaxLength(500)
  canonicalUrl!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;

  @IsOptional()
  priority?: number;
}
