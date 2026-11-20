import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  body!: string;

  @ApiProperty({
    description:
      'Client-generated UUID. Reuse it when retrying the same send request.',
  })
  @IsUUID()
  clientMessageId!: string;
}
