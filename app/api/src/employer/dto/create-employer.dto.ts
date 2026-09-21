import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployerDto {
  @ApiProperty({ example: '7701234567', description: 'TIN / INN' })
  @IsString()
  @Matches(/^(\d{10}|\d{12})$/, { message: 'inn must contain 10 or 12 digits' })
  inn!: string;

  @ApiProperty({ example: 'ООО ТехноПром', maxLength: 300 })
  @IsString() @Length(1, 300) legalName!: string;

  @ApiPropertyOptional({ example: 'ТехноПром', maxLength: 300 })
  @IsOptional() @IsString() @MaxLength(300) shortName?: string;

  @ApiPropertyOptional({ example: 'Мы развиваем digital-платформы.', maxLength: 5000 })
  @IsOptional() @IsString() @MaxLength(5000) description?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional() @IsUrl({ require_tld: false }) website?: string;

  @ApiPropertyOptional({ example: 'hr@example.com' })
  @IsOptional() @IsEmail() email?: string;

  @ApiPropertyOptional({ example: '+79001234567', maxLength: 32 })
  @IsOptional() @IsString() @MaxLength(32) phone?: string;

  @ApiPropertyOptional({ example: 'г. Москва, ул. Ленина, 10', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500) address?: string;
}
