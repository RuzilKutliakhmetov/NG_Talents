import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectVacancyDto {
  @ApiProperty({
    example: 'Вакансия не соответствует требованиям и требованиям к квалификации.',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString() @Length(1, 2000) comment!: string;
}
