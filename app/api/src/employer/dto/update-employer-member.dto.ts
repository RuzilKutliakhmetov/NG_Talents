import { EmployerMemberRole } from '../../generated/prisma/client.js';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEmployerMemberDto {
  @ApiProperty({ enum: EmployerMemberRole, example: EmployerMemberRole.ADMIN })
  @IsEnum(EmployerMemberRole) role!: EmployerMemberRole;
}
