import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  EmploymentType,
  VacancyRegion,
  WorkFormat,
} from '../../generated/prisma/client.js';
import {
  VacancyCertificationInput,
  VacancyRequirementInput,
} from './create-vacancy.dto.js';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVacancyDto {
  @ApiPropertyOptional({ example: 'Senior Frontend Developer', maxLength: 200 })
  @IsOptional() @IsString() @MaxLength(200) title?: string;

  @ApiPropertyOptional({
    example: 'Расширяем описание вакансии и уточняем требования.',
    maxLength: 20000,
  })
  @IsOptional() @IsString() @MaxLength(20000) description?: string;

  @ApiPropertyOptional({ example: 180000, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) salaryMin?: number;

  @ApiPropertyOptional({ example: 260000, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) salaryMax?: number;

  @ApiPropertyOptional({ example: 'RUB', maxLength: 8 })
  @IsOptional() @IsString() @MaxLength(8) salaryCurrency?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() salaryGross?: boolean;

  @ApiPropertyOptional({ enum: EmploymentType, example: EmploymentType.PERMANENT })
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;

  @ApiPropertyOptional({ enum: WorkFormat, example: WorkFormat.HYBRID })
  @IsOptional() @IsEnum(WorkFormat) workFormat?: WorkFormat;

  @ApiPropertyOptional({ enum: VacancyRegion, example: VacancyRegion.TATARSTAN })
  @IsOptional() @IsEnum(VacancyRegion) locationRegion?: VacancyRegion;

  @ApiPropertyOptional({ example: 'Уфа', maxLength: 200 })
  @IsOptional() @IsString() @MaxLength(200) locationCity?: string;

  @ApiPropertyOptional({ example: 'ул. Ленина, 25', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500) locationAddress?: string;

  @ApiPropertyOptional({ example: '5/2', maxLength: 300 })
  @IsOptional() @IsString() @MaxLength(300) schedule?: string;

  @ApiPropertyOptional({ example: 'React, TypeScript, архитектура сервисов', maxLength: 10000 })
  @IsOptional() @IsString() @MaxLength(10000) requirements?: string;

  @ApiPropertyOptional({ example: 'Соцпакет, гибкий график', maxLength: 10000 })
  @IsOptional() @IsString() @MaxLength(10000) conditions?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() housingProvided?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean() travelProvided?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() medicalInsurance?: boolean;

  @ApiPropertyOptional({ type: [VacancyRequirementInput] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VacancyRequirementInput)
  requirementsList?: VacancyRequirementInput[];

  @ApiPropertyOptional({ type: [VacancyCertificationInput] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VacancyCertificationInput)
  certifications?: VacancyCertificationInput[];
}
