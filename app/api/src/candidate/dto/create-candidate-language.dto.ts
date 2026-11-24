import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LanguageLevel } from '../../generated/prisma/client.js';

export class CreateCandidateLanguageDto {
  @ApiProperty({ example: 'Английский', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: LanguageLevel, example: LanguageLevel.B2 })
  @IsEnum(LanguageLevel)
  level!: LanguageLevel;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
