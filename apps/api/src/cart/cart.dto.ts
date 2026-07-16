import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const garmentViews = ['FRONT', 'BACK'] as const;

export class AddCartLineDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @Matches(/^[0-9a-f-]{36}$/i)
  artworkVersionId!: string;
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @Matches(/^[0-9a-f-]{36}$/i)
  garmentVariantId!: string;
  @ApiProperty({ format: 'uuid' }) @IsString() @Matches(/^[0-9a-f-]{36}$/i) placementId!: string;

  @ApiProperty({ example: 'standard' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(64)
  scalePreset!: string;

  @ApiProperty({ enum: garmentViews })
  @IsIn(garmentViews)
  view!: (typeof garmentViews)[number];

  // A price is deliberately absent: it is resolved from the approved pair on the server and a
  // browser-supplied amount is never accepted.
  @ApiPropertyOptional({ minimum: 1, maximum: 20, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number = 1;
}

export class UpdateCartLineDto {
  @ApiProperty({ minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;
}

export class PromotionCodeDto {
  @ApiProperty({ example: 'WELCOME10' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{2,63}$/)
  code!: string;
}
