import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
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

const garmentTypes = [
  'CLASSIC_TSHIRT',
  'OVERSIZED_TSHIRT',
  'LONG_SLEEVE',
  'HOODIE',
  'SWEATSHIRT',
  'TOTE_BAG',
  'CAP',
  'ART_PRINT',
] as const;
const lifecycleStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
const compatibilityStatuses = ['DRAFT', 'APPROVED', 'ARCHIVED'] as const;
const garmentViews = ['FRONT', 'BACK', 'LEFT', 'RIGHT'] as const;

export class GarmentListQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() cursor?: string;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @ApiPropertyOptional({ enum: garmentTypes })
  @IsOptional()
  @IsIn(garmentTypes)
  type?: (typeof garmentTypes)[number];
}

export class GarmentTemplateDto {
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
  @ApiProperty({ enum: garmentTypes }) @IsIn(garmentTypes) type!: (typeof garmentTypes)[number];
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fabric?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fit?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  care?: string | null;
}

export class GarmentTemplateUpdateDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
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
  @ApiPropertyOptional({ enum: garmentTypes })
  @IsOptional()
  @IsIn(garmentTypes)
  type?: (typeof garmentTypes)[number];
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) fabric?:
    string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) fit?:
    string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  care?: string | null;
  @ApiPropertyOptional({ enum: lifecycleStatuses })
  @IsOptional()
  @IsIn(lifecycleStatuses)
  status?: (typeof lifecycleStatuses)[number];
}

export class GarmentColourDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
  @ApiProperty({ maxLength: 100 }) @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @ApiProperty({ example: '#111111' }) @Matches(/^#[0-9A-Fa-f]{6}$/) hex!: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) position = 0;
  @ApiPropertyOptional({ enum: lifecycleStatuses })
  @IsOptional()
  @IsIn(lifecycleStatuses)
  status?: (typeof lifecycleStatuses)[number];
}

export class GarmentMeasurementDto {
  @ApiProperty({ maxLength: 64 })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_]*$/)
  key!: string;
  @ApiProperty({ maxLength: 100 }) @IsString() @MinLength(1) @MaxLength(100) label!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) valueMm!: number;
}

export class GarmentSizeDto {
  @ApiProperty({ maxLength: 32 }) @IsString() @MinLength(1) @MaxLength(32) code!: string;
  @ApiProperty({ maxLength: 100 }) @IsString() @MinLength(1) @MaxLength(100) label!: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) position = 0;
  @ApiPropertyOptional({ enum: lifecycleStatuses })
  @IsOptional()
  @IsIn(lifecycleStatuses)
  status?: (typeof lifecycleStatuses)[number];
  @ApiPropertyOptional({ type: [GarmentMeasurementDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GarmentMeasurementDto)
  measurements: GarmentMeasurementDto[] = [];
}

export class GarmentVariantDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() colourId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() sizeId!: string;
  @ApiProperty({ maxLength: 80 }) @IsString() @MinLength(1) @MaxLength(80) sku!: string;
  @ApiPropertyOptional({ enum: lifecycleStatuses })
  @IsOptional()
  @IsIn(lifecycleStatuses)
  status?: (typeof lifecycleStatuses)[number];
}

export class GarmentPlacementDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
  @ApiProperty({ maxLength: 100 }) @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @ApiProperty({ enum: garmentViews }) @IsIn(garmentViews) view!: (typeof garmentViews)[number];
  @ApiProperty({ minimum: 0, maximum: 999 }) @IsInt() @Min(0) @Max(999) xPermille!: number;
  @ApiProperty({ minimum: 0, maximum: 999 }) @IsInt() @Min(0) @Max(999) yPermille!: number;
  @ApiProperty({ minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  widthPermille!: number;
  @ApiProperty({ minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  heightPermille!: number;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) printWidthMm!: number;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) printHeightMm!: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) position = 0;
  @ApiPropertyOptional({ enum: lifecycleStatuses })
  @IsOptional()
  @IsIn(lifecycleStatuses)
  status?: (typeof lifecycleStatuses)[number];
}

export class GarmentScalePresetDto {
  @ApiProperty({ maxLength: 64 })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
  @ApiProperty({ maxLength: 100 }) @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @ApiProperty({ minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  scalePercent!: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) position = 0;
  @ApiPropertyOptional({ enum: lifecycleStatuses })
  @IsOptional()
  @IsIn(lifecycleStatuses)
  status?: (typeof lifecycleStatuses)[number];
}

export class GarmentCompatibilityDto {
  @ApiProperty({ enum: compatibilityStatuses })
  @IsIn(compatibilityStatuses)
  status!: (typeof compatibilityStatuses)[number];
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  placementIds: string[] = [];
}

export class GarmentConfigurationDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() artworkVersionId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() garmentVariantId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() placementId!: string;
  @ApiProperty({ maxLength: 64 })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  scalePreset!: string;
  @ApiProperty({ enum: garmentViews }) @IsIn(garmentViews) view!: (typeof garmentViews)[number];
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity = 1;
}
