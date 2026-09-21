import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const RESUME_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const RESUME_MAX_SIZE_BYTES = 10 * 1024 * 1024;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateResumeDto {
  @ApiProperty({ example: 'Основное резюме', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'resume.pdf', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName!: string;

  @ApiProperty({ enum: RESUME_ALLOWED_MIME_TYPES })
  @Transform(trim)
  @IsString()
  @IsIn([...RESUME_ALLOWED_MIME_TYPES])
  mimeType!: string;

  @ApiProperty({ example: 245760, minimum: 1, maximum: RESUME_MAX_SIZE_BYTES })
  @IsInt()
  @Min(1)
  @Max(RESUME_MAX_SIZE_BYTES)
  sizeBytes!: number;

  @ApiProperty({
    example: 'candidates/user-id/resumes/resume-id.pdf',
    maxLength: 500,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  storageKey!: string;
}
