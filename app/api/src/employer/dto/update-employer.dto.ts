import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployerDto {
  @ApiPropertyOptional({ example: 'ООО ТехноПром', maxLength: 300 })
  @IsOptional() @IsString() @Length(1, 300) legalName?: string;

  @ApiPropertyOptional({ example: 'ТехноПром', maxLength: 300 })
  @IsOptional() @IsString() @MaxLength(300) shortName?: string;

  @ApiPropertyOptional({ example: 'Описание компании обновлено.', maxLength: 5000 })
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
