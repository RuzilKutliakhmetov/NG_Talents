import { EmployerMemberRole } from '../../generated/prisma/client.js';
import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployerMemberDto {
  @ApiProperty({ example: '5f9b3a2d-5d52-4d3b-9bbc-2d77d9c7ad5a' })
  @IsUUID() userId!: string;

  @ApiProperty({ enum: EmployerMemberRole, example: EmployerMemberRole.OWNER })
  @IsEnum(EmployerMemberRole) role!: EmployerMemberRole;
}
