import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const deliveryMethods = ['STANDARD', 'EXPRESS'] as const;

export class CheckoutAddressDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) state!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) city!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) line1!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(200) line2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(20) postcode?: string;
}

export class CheckoutContactDto {
  @ApiProperty() @IsEmail() @MaxLength(320) email!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9][0-9 ()-]{6,19}$/)
  phone?: string;
}

export class CheckoutQuoteDto {
  @ApiProperty({ type: CheckoutAddressDto })
  @ValidateNested()
  @Type(() => CheckoutAddressDto)
  address!: CheckoutAddressDto;

  @ApiProperty({ enum: deliveryMethods })
  @IsIn(deliveryMethods)
  deliveryMethodId!: (typeof deliveryMethods)[number];
}

export class PlaceOrderDto extends CheckoutQuoteDto {
  @ApiProperty({ type: CheckoutContactDto })
  @ValidateNested()
  @Type(() => CheckoutContactDto)
  contact!: CheckoutContactDto;
}
