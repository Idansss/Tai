import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class MockupUploadDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() garmentTemplateId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() garmentPlacementId!: string;
}

export class MockupApprovalDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ maxLength: 500 })
  @ValidateIf((value: MockupApprovalDto) => value.status === 'REJECTED')
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string;
}
