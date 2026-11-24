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
import { CreateResumeDto } from './dto/create-resume.dto.js';
import { UpdateResumeDto } from './dto/update-resume.dto.js';
import { CreateStructuredResumeDto } from './dto/create-structured-resume.dto.js';
import { UpdateStructuredResumeDto } from './dto/update-structured-resume.dto.js';
import { ResumeService } from './resume.service.js';
import { RESUME_MAX_SIZE_BYTES } from './dto/create-resume.dto.js';
import type { UploadedFileInput } from '../storage/uploaded-file.js';

@ApiTags('Candidate resumes')
@ApiBearerAuth()
@Controller('candidate/resumes')
@Roles(UserRole.CANDIDATE)
export class ResumeController {
  constructor(private readonly service: ResumeService) {}

  @Post('structured')
  @ApiOperation({ summary: 'Create a structured resume' })
  @ApiResponse({ status: 201 })
  createStructured(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateStructuredResumeDto,
  ) {
    return this.service.createStructured(user.sub, dto);
  }

  @Patch(':id/structured')
  @ApiOperation({ summary: 'Update a structured resume' })
  updateStructured(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStructuredResumeDto,
  ) {
    return this.service.updateStructured(user.sub, id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a resume' })
  publish(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.publish(user.sub, id);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Return a published resume to draft status' })
  unpublish(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.unpublish(user.sub, id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a resume' })
  archive(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.archive(user.sub, id);
  }

  @Post(':id/copy')
  @ApiOperation({ summary: 'Copy an existing resume as a draft' })
  copy(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.copy(user.sub, id);
  }

  @Get()
  @ApiOperation({ summary: 'List current candidate resumes' })
  list(@CurrentUser() user: { sub: string }) {
    return this.service.list(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Upload resume' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', maxLength: 200 },
        isPrimary: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 201 })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: RESUME_MAX_SIZE_BYTES } }),
  )
  create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateResumeDto,
    @UploadedFile() file: UploadedFileInput,
  ) {
    return this.service.create(user.sub, dto, file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get current candidate resume' })
  get(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(user.sub, id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Generate a short-lived download URL for a resume' })
  @ApiResponse({ status: 200 })
  download(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.download(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update resume metadata' })
  update(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResumeDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete resume metadata' })
  remove(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(user.sub, id);
  }

  @Post(':id/primary')
  @ApiOperation({ summary: 'Set resume as primary' })
  setPrimary(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.setPrimary(user.sub, id);
  }
}
