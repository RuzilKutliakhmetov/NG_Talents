import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  Matches,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '../../generated/prisma/client.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCandidateDocumentDto {
  @ApiProperty({ enum: DocumentType, example: DocumentType.CERTIFICATE })
  @IsEnum(DocumentType)
  type!: DocumentType;

  @ApiProperty({
    example: 'Сертификат промышленной безопасности',
    maxLength: 300,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(300)
  title!: string;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional({ example: '2029-01-10' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
