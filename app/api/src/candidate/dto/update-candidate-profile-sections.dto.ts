import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { CreateCandidateCertificationDto } from './create-candidate-certification.dto.js';
import { CreateCandidateEducationDto } from './create-candidate-education.dto.js';
import { CreateCandidateExperienceDto } from './create-candidate-experience.dto.js';
import { CreateCandidateLanguageDto } from './create-candidate-language.dto.js';
import { CreateCandidatePortfolioLinkDto } from './create-candidate-portfolio-link.dto.js';

export class UpdateCandidateProfileSectionsDto {
  @ApiPropertyOptional({ type: [CreateCandidateExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCandidateExperienceDto)
  experiences?: CreateCandidateExperienceDto[];

  @ApiPropertyOptional({ type: [CreateCandidateEducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCandidateEducationDto)
  educations?: CreateCandidateEducationDto[];

  @ApiPropertyOptional({ type: [CreateCandidateCertificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCandidateCertificationDto)
  certifications?: CreateCandidateCertificationDto[];

  @ApiPropertyOptional({ type: [CreateCandidateLanguageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCandidateLanguageDto)
  languages?: CreateCandidateLanguageDto[];

  @ApiPropertyOptional({ type: [CreateCandidatePortfolioLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCandidatePortfolioLinkDto)
  portfolioLinks?: CreateCandidatePortfolioLinkDto[];
}
