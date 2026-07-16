import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const garmentViews = ['FRONT', 'BACK'] as const;
const visibilities = ['PRIVATE', 'UNLISTED'] as const;

export class SaveDesignDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() artworkVersionId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() garmentVariantId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() placementId!: string;

  @ApiProperty({ example: 'standard' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(64)
  scalePreset!: string;

  @ApiProperty({ enum: garmentViews })
  @IsIn(garmentViews)
  view!: (typeof garmentViews)[number];

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;
}

export class UpdateDesignDto {
  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @ValidateIf((object: UpdateDesignDto) => object.name !== null)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string | null;

  @ApiPropertyOptional({ enum: visibilities })
  @IsOptional()
  @IsIn(visibilities)
  visibility?: (typeof visibilities)[number];
}
