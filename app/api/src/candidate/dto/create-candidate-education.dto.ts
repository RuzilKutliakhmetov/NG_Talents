import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateEducationDto {
  @ApiProperty({ example: 'МГУ им. Ломоносова', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  institution!: string;

  @ApiProperty({
    example: 'Прикладная математика и информатика',
    maxLength: 300,
  })
  @IsString()
  @MaxLength(300)
  specialization!: string;

  @ApiPropertyOptional({ example: 'Бакалавр', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  degree?: string;

  @ApiProperty({ example: '2015-09-01', format: 'date' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2019-06-30', format: 'date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'Специализация по аналитике данных и машинному обучению.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'Факультет информатики', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  faculty?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isIncomplete?: boolean;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
