import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApplicationStatus } from '../../generated/prisma/client.js';

export class EmployerApplicationListQueryDto {
  @IsOptional() @IsString() vacancyId?: string;
  @IsOptional() @IsString() candidateId?: string;
  @IsOptional() @IsEnum(ApplicationStatus) status?: ApplicationStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @IsOptional()
  @IsIn(['createdAt', 'appliedAt', 'updatedAt', 'status'])
  sort: 'createdAt' | 'appliedAt' | 'updatedAt' | 'status' = 'appliedAt';
  @IsOptional() @IsIn(['asc', 'desc']) direction: 'asc' | 'desc' = 'desc';
}
