import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateStructuredResumeDto } from './create-structured-resume.dto.js';

export class UpdateStructuredResumeDto extends PartialType(
  OmitType(CreateStructuredResumeDto, [
    'experiences',
    'educations',
    'languages',
    'certifications',
    'portfolioLinks',
  ] as const),
) {}
