import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail() email!: string;

  @ApiProperty({ example: 'Password123!', minLength: 1, maxLength: 128 })
  @IsString() @Length(1, 128) password!: string;
}
