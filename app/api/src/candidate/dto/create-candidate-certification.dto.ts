import { CandidateCertificationType } from '../../generated/prisma/client.js';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateCertificationDto {
  @ApiProperty({
    enum: CandidateCertificationType,
    example: CandidateCertificationType.ELECTRICAL_SAFETY,
  })
  @IsEnum(CandidateCertificationType)
  type!: CandidateCertificationType;

  @ApiProperty({ example: 'Сертификат по электробезопасности', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  name!: string;

  @ApiPropertyOptional({ example: '123456789', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  number?: string;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional({ example: '2029-01-10' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Ростехнадзор', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  issuer?: string;
}
