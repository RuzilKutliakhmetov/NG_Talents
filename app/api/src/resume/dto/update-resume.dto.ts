import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  RESUME_ALLOWED_MIME_TYPES,
  RESUME_MAX_SIZE_BYTES,
} from './create-resume.dto.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateResumeDto {
  @ApiPropertyOptional({ example: 'Обновленное резюме', maxLength: 200 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'resume-updated.pdf', maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName?: string;

  @ApiPropertyOptional({ enum: RESUME_ALLOWED_MIME_TYPES })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsIn([...RESUME_ALLOWED_MIME_TYPES])
  mimeType?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: RESUME_MAX_SIZE_BYTES })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(RESUME_MAX_SIZE_BYTES)
  sizeBytes?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  storageKey?: string;
}
