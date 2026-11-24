import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EmploymentType,
  LanguageLevel,
  WorkFormat,
} from '../../generated/prisma/client.js';

class ResumeExperienceDto {
  @IsString()
  @MaxLength(200)
  companyName!: string;

  @IsString()
  @MaxLength(200)
  position!: string;

  @IsString()
  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  achievements?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class ResumeEducationDto {
  @IsString()
  @MaxLength(300)
  institution!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  faculty?: string;

  @IsString()
  @MaxLength(300)
  specialization!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  degree?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isIncomplete?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class ResumeSkillDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  level?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class ResumeLanguageDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEnum(LanguageLevel)
  level!: LanguageLevel;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class ResumeCertificationDto {
  @IsString()
  @MaxLength(300)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  issuer?: string;

  @IsOptional()
  @IsString()
  issuedAt?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class ResumePortfolioLinkDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsUrl({ require_protocol: true })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateStructuredResumeDto {
  @ApiPropertyOptional({ maxLength: 200, description: 'Профессия кандидата' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  desiredPosition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  specialization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  summary?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    nullable: true,
    description: 'Желаемая месячная зарплата в рублях',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  desiredSalary?: number | null;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  workSchedule?: string;

  @IsOptional()
  @IsEnum(WorkFormat)
  workFormat?: WorkFormat;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  geoPreferences?: unknown;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @ApiHideProperty()
  @ValidateNested({ each: true })
  @Type(() => ResumeExperienceDto)
  experiences?: ResumeExperienceDto[];

  @IsOptional()
  @IsArray()
  @ApiHideProperty()
  @ValidateNested({ each: true })
  @Type(() => ResumeEducationDto)
  educations?: ResumeEducationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeSkillDto)
  skills?: ResumeSkillDto[];

  @IsOptional()
  @IsArray()
  @ApiHideProperty()
  @ValidateNested({ each: true })
  @Type(() => ResumeLanguageDto)
  languages?: ResumeLanguageDto[];

  @IsOptional()
  @IsArray()
  @ApiHideProperty()
  @ValidateNested({ each: true })
  @Type(() => ResumeCertificationDto)
  certifications?: ResumeCertificationDto[];

  @IsOptional()
  @IsArray()
  @ApiHideProperty()
  @ValidateNested({ each: true })
  @Type(() => ResumePortfolioLinkDto)
  portfolioLinks?: ResumePortfolioLinkDto[];
}
