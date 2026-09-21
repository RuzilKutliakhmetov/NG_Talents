import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  @IsEmail() email!: string;

  @ApiPropertyOptional({ example: '+79991234567', description: 'Phone number' })
  @IsOptional() @IsString() @MaxLength(32) phone?: string;

  @ApiProperty({
    example: 'Password123!',
    minLength: 8,
    maxLength: 128,
    description: 'Password',
  })
  @IsString() @Length(8, 128) password!: string;

  @ApiProperty({ example: 'Иван', minLength: 1, maxLength: 100 })
  @IsString() @Length(1, 100) firstName!: string;

  @ApiProperty({ example: 'Иванов', minLength: 1, maxLength: 100 })
  @IsString() @Length(1, 100) lastName!: string;

  @ApiPropertyOptional({ example: 'Иванович', minLength: 1, maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100) middleName?: string;
}
