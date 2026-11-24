import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, WorkFormat } from '../../generated/prisma/client.js';
import { UpdateCandidateProfileSectionsDto } from './update-candidate-profile-sections.dto.js';

export class UpdateCandidateProfileDto extends UpdateCandidateProfileSectionsDto {
  @ApiPropertyOptional({ example: '1995-06-15' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'Россия' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  citizenship?: string;

  @ApiPropertyOptional({ example: 'Уфа' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Башкортостан' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ example: 'Backend Developer' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  desiredPosition?: string;

  @ApiPropertyOptional({ example: 'Backend-разработка' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  specialization?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @ApiPropertyOptional({ example: 'Высшее' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  education?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  readyForShiftWork?: boolean;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ enum: WorkFormat })
  @IsOptional()
  @IsEnum(WorkFormat)
  workFormat?: WorkFormat;

  @ApiPropertyOptional({ example: 'Гибкий график' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  preferredSchedule?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  readyToRelocate?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  readyForTrips?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showContacts?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hideFromEmployers?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    example:
      'Обновлённое описание профиля: готов к релокации и проектной работе.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  about?: string;
}
