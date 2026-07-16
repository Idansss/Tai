import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  IsBoolean,
  IsISO8601,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CatalogueListQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() cursor?: string;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
export class ArtworkCatalogueQueryDto extends CatalogueListQueryDto {
  @ApiPropertyOptional({ maxLength: 200 }) @IsOptional() @IsString() @MaxLength(200) q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() collection?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() drop?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tag?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() theme?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mood?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colourFamily?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  limitedEdition?: boolean;
  @ApiPropertyOptional({ enum: ['newest'] })
  @IsOptional()
  @IsIn(['newest'])
  sort = 'newest' as const;
}
export class CatalogueEntryDto {
  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
  @ApiProperty({ maxLength: 200 }) @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;
}
export class CatalogueEntryUpdateDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
export class DropDto extends CatalogueEntryDto {
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  startsAt?: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  endsAt?: string | null;
}
export class DropUpdateDto extends CatalogueEntryUpdateDto {
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  startsAt?: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  endsAt?: string | null;
}
export class TagDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @ApiProperty({ enum: ['GENERAL', 'THEME', 'MOOD', 'COLOUR_FAMILY'] })
  @IsIn(['GENERAL', 'THEME', 'MOOD', 'COLOUR_FAMILY'])
  kind: 'GENERAL' | 'THEME' | 'MOOD' | 'COLOUR_FAMILY' = 'GENERAL';
}
export class AssociationDto {
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) position = 0;
}
export class EditionDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsInt() @Min(1) totalQuantity?:
    number | null;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() numbered = false;
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
export class StoryBlockDto {
  @ApiProperty({ enum: ['TEXT', 'IMAGE', 'QUOTE', 'EMBED'] })
  @IsIn(['TEXT', 'IMAGE', 'QUOTE', 'EMBED'])
  type!: 'TEXT' | 'IMAGE' | 'QUOTE' | 'EMBED';
  @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject() content!: Record<
    string,
    unknown
  >;
}
export class StoryDto {
  @ApiProperty() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) excerpt?:
    string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() artworkId?:
    string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() collectionId?:
    string | null;
  @ApiProperty({ type: [StoryBlockDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => StoryBlockDto)
  blocks: StoryBlockDto[] = [];
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
