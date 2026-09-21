import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/client.js';
import { CreateResumeDto } from './dto/create-resume.dto.js';
import { UpdateResumeDto } from './dto/update-resume.dto.js';
import { ResumeService } from './resume.service.js';

@ApiTags('Candidate resumes')
@ApiBearerAuth()
@Controller('candidate/resumes')
@Roles(UserRole.CANDIDATE)
export class ResumeController {
  constructor(private readonly service: ResumeService) {}

  @Get()
  @ApiOperation({ summary: 'List current candidate resumes' })
  list(@CurrentUser() user: { sub: string }) {
    return this.service.list(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create resume metadata' })
  @ApiResponse({ status: 201 })
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateResumeDto) {
    return this.service.create(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get current candidate resume' })
  get(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(user.sub, id);
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
