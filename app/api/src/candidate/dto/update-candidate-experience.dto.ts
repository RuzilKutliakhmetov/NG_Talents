import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCandidateExperienceDto {
  @ApiPropertyOptional({ example: 'ООО ТехноГрид', maxLength: 200 })
  @IsOptional() @IsString() @MaxLength(200) companyName?: string;

  @ApiPropertyOptional({ example: 'Senior Frontend Engineer', maxLength: 200 })
  @IsOptional() @IsString() @MaxLength(200) position?: string;

  @ApiPropertyOptional({ example: '2022-02-01' })
  @IsOptional() @IsDateString() startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional() @IsDateString() endDate?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean() isCurrent?: boolean;

  @ApiPropertyOptional({
    example: 'Улучшал производительность интерфейса и архитектуру UI.',
    maxLength: 5000,
  })
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
}
