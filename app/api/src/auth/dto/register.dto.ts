import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsString() @Length(8, 128) password!: string;
  @IsString() @Length(1, 100) firstName!: string;
  @IsString() @Length(1, 100) lastName!: string;
  @IsOptional() @IsString() @MaxLength(100) middleName?: string;
}
