import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateEducationDto {
  @ApiProperty({ example: 'МГУ им. Ломоносова', maxLength: 300 })
  @IsString() @MaxLength(300) institution!: string;

  @ApiProperty({ example: 'Прикладная математика и информатика', maxLength: 300 })
  @IsString() @MaxLength(300) specialization!: string;

  @ApiPropertyOptional({ example: 'Бакалавр', maxLength: 150 })
  @IsOptional() @IsString() @MaxLength(150) degree?: string;

  @ApiPropertyOptional({ example: 2015, minimum: 1900, maximum: 2200 })
  @IsOptional() @IsInt() @Min(1900) @Max(2200) startYear?: number;

  @ApiPropertyOptional({ example: 2019, minimum: 1900, maximum: 2200 })
  @IsOptional() @IsInt() @Min(1900) @Max(2200) endYear?: number;

  @ApiPropertyOptional({
    example: 'Специализация по аналитике данных и машинному обучению.',
    maxLength: 5000,
  })
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
}
