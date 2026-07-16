import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const adjustmentKinds = ['ADJUSTMENT', 'RETURN', 'DAMAGE'] as const;

export class InventoryReceiptDto {
  @ApiProperty({ minimum: 1, maximum: 100000 })
  @IsInt()
  @Min(1)
  @Max(100000)
  quantity!: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  reference?: string;
}

export class InventoryAdjustmentDto {
  // Signed: a correction can add or remove. Zero is rejected by the database as a movement
  // that moves nothing, so it is rejected here too rather than silently writing a no-op.
  @ApiProperty({ minimum: -100000, maximum: 100000 })
  @IsInt()
  @Min(-100000)
  @Max(100000)
  quantityDelta!: number;

  @ApiProperty({
    maxLength: 500,
    description: 'An adjustment is a human decision and must say why.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ enum: adjustmentKinds, default: 'ADJUSTMENT' })
  @IsOptional()
  @IsIn(adjustmentKinds)
  kind?: (typeof adjustmentKinds)[number];

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  reference?: string;
}

export class InventoryThresholdDto {
  @ApiProperty({ minimum: 0, maximum: 100000 })
  @IsInt()
  @Min(0)
  @Max(100000)
  lowStockThreshold!: number;
}

export class InventoryListQueryDto {
  @ApiPropertyOptional({ description: 'Return only variants at or below their threshold.' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsIn([true, false])
  lowStockOnly?: boolean;
}
