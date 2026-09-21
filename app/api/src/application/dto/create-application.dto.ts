import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiProperty({
    example: 'd8fe9d77-2f8d-4d47-9bfa-80a9297b7b04',
    description: 'Vacancy UUID',
  })
  @IsUUID()
  vacancyId!: string;

  @ApiPropertyOptional({
    example: 'a1f1d2b3-c4d5-4678-9012-abcdef123456',
    description: 'Optional owned Resume UUID',
  })
  @IsOptional()
  @IsUUID()
  resumeId?: string;

  @ApiPropertyOptional({
    example: 'Здравствуйте! Я заинтересован в вашей вакансии.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverLetter?: string;

  @ApiPropertyOptional({
    example: 'Готов приступить к работе с 01.10.2026.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  candidateComment?: string;
}
