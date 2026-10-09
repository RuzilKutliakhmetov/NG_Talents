import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/client.js';
import { CreateCandidateDocumentDto } from './dto/create-candidate-document.dto.js';
import { UpdateCandidateDocumentDto } from './dto/update-candidate-document.dto.js';
import { CandidateDocumentService } from './candidate-document.service.js';
import { STORAGE_FILE_MAX_SIZE_BYTES } from '../storage/uploaded-file.js';
import type { UploadedFileInput } from '../storage/uploaded-file.js';

@ApiTags('Candidate documents')
@ApiBearerAuth()
@Controller('candidate/documents')
@Roles(UserRole.CANDIDATE)
export class CandidateDocumentController {
  constructor(private readonly service: CandidateDocumentService) {}

  @Get()
  @ApiOperation({ summary: 'List current candidate documents' })
  list(@CurrentUser() user: { sub: string }) {
    return this.service.list(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Upload candidate document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type', 'title'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: {
          type: 'string',
          enum: [
            'RESUME',
            'CERTIFICATE',
            'LICENSE',
            'ID_CARD',
            'DIPLOMA',
            'OTHER',
          ],
        },
        title: { type: 'string', maxLength: 300 },
        issuedAt: { type: 'string', format: 'date' },
        expiresAt: { type: 'string', format: 'date' },
      },
    },
  })
  @ApiResponse({ status: 201 })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: STORAGE_FILE_MAX_SIZE_BYTES },
    }),
  )
  create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateCandidateDocumentDto,
    @UploadedFile() file: UploadedFileInput,
  ) {
    return this.service.create(user.sub, dto, file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get current candidate document' })
  get(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(user.sub, id);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Generate a short-lived download URL for a candidate document',
  })
  @ApiResponse({ status: 200 })
  download(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.download(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update candidate document metadata' })
  update(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateDocumentDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete candidate document metadata' })
  remove(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(user.sub, id);
  }
}
