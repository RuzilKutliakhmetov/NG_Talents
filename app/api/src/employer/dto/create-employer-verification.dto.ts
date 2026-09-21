import {
  EmployerVerificationMethod,
  EmployerVerificationStatus,
} from '../../generated/prisma/client.js';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployerVerificationDto {
  @ApiProperty({
    enum: EmployerVerificationStatus,
    example: EmployerVerificationStatus.PENDING,
  })
  @IsEnum(EmployerVerificationStatus) status!: EmployerVerificationStatus;

  @ApiProperty({
    enum: EmployerVerificationMethod,
    example: EmployerVerificationMethod.DADATA,
  })
  @IsEnum(EmployerVerificationMethod) method!: EmployerVerificationMethod;

  @ApiPropertyOptional({ example: 'Подтверждаем данные компании', maxLength: 5000 })
  @IsOptional() @IsString() @MaxLength(5000) comment?: string;
}
