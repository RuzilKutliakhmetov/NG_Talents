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
  CandidateCertificationType,
  EmploymentType,
  VacancyRegion,
  WorkFormat,
} from '../../generated/prisma/client.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VacancyRequirementInput {
  @ApiProperty({ example: 'Опыт работы с Node.js не менее 2 лет', maxLength: 1000 })
  @IsString() @MaxLength(1000) text!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() isRequired?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class VacancyCertificationInput {
  @ApiProperty({
    enum: CandidateCertificationType,
    example: CandidateCertificationType.ELECTRICAL_SAFETY,
  })
  @IsEnum(CandidateCertificationType) type!: CandidateCertificationType;

  @ApiPropertyOptional({ example: 'Электробезопасность', maxLength: 300 })
  @IsOptional() @IsString() @MaxLength(300) name?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() isRequired?: boolean;
}

export class CreateVacancyDto {
  @ApiProperty({ example: 'Frontend Developer', maxLength: 200 })
  @IsString() @MaxLength(200) title!: string;

  @ApiProperty({ example: 'Ищем инженера для работы над продуктовым интерфейсом.', maxLength: 20000 })
  @IsString() @MaxLength(20000) description!: string;

  @ApiPropertyOptional({ example: 150000, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) salaryMin?: number;

  @ApiPropertyOptional({ example: 220000, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) salaryMax?: number;

  @ApiPropertyOptional({ example: 'RUB', maxLength: 8 })
  @IsOptional() @IsString() @MaxLength(8) salaryCurrency?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() salaryGross?: boolean;

  @ApiProperty({ enum: EmploymentType, example: EmploymentType.PERMANENT })
  @IsEnum(EmploymentType) employmentType!: EmploymentType;

  @ApiPropertyOptional({ enum: WorkFormat, example: WorkFormat.HYBRID })
  @IsOptional() @IsEnum(WorkFormat) workFormat?: WorkFormat;

  @ApiProperty({ enum: VacancyRegion, example: VacancyRegion.TATARSTAN })
  @IsEnum(VacancyRegion) locationRegion!: VacancyRegion;

  @ApiPropertyOptional({ example: 'Уфа', maxLength: 200 })
  @IsOptional() @IsString() @MaxLength(200) locationCity?: string;

  @ApiPropertyOptional({ example: 'ул. Ленина, 10', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500) locationAddress?: string;

  @ApiPropertyOptional({ example: '5/2', maxLength: 300 })
  @IsOptional() @IsString() @MaxLength(300) schedule?: string;

  @ApiPropertyOptional({ example: 'Работа в продуктовой команде', maxLength: 10000 })
  @IsOptional() @IsString() @MaxLength(10000) requirements?: string;

  @ApiPropertyOptional({ example: 'Полный соцпакет и бонусы', maxLength: 10000 })
  @IsOptional() @IsString() @MaxLength(10000) conditions?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() housingProvided?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean() travelProvided?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() medicalInsurance?: boolean;

  @ApiPropertyOptional({
    type: [VacancyRequirementInput],
    example: [{ text: 'Опыт работы с TypeScript', isRequired: true }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VacancyRequirementInput)
  requirementsList?: VacancyRequirementInput[];

  @ApiPropertyOptional({
    type: [VacancyCertificationInput],
    example: [{ type: CandidateCertificationType.ELECTRICAL_SAFETY, isRequired: true }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VacancyCertificationInput)
  certifications?: VacancyCertificationInput[];
}
