import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  CandidateCertificationType,
  EmploymentType,
  VacancyRegion,
  VacancyStatus,
  WorkFormat,
} from '../../generated/prisma/client.js';

export class VacancyQueryDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() @IsEnum(VacancyRegion) locationRegion?: VacancyRegion;
  @IsOptional() @IsString() locationCity?: string;
  @IsOptional() @IsEnum(WorkFormat) workFormat?: WorkFormat;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) salaryMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) salaryMax?: number;
  @IsOptional()
  @IsEnum(CandidateCertificationType)
  certification?: CandidateCertificationType;
  @IsOptional() @IsEnum(VacancyStatus) status?: VacancyStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @IsOptional() @IsIn(['createdAt', 'salaryMin', 'salaryMax']) sort:
    'createdAt' | 'salaryMin' | 'salaryMax' = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) direction: 'asc' | 'desc' = 'desc';
}
