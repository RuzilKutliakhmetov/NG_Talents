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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/client.js';
import { CandidateService } from './candidate.service.js';
import { CreateCandidateProfileDto } from './dto/create-candidate-profile.dto.js';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto.js';
import { CreateCandidateExperienceDto } from './dto/create-candidate-experience.dto.js';
import { UpdateCandidateExperienceDto } from './dto/update-candidate-experience.dto.js';
import { CreateCandidateEducationDto } from './dto/create-candidate-education.dto.js';
import { UpdateCandidateEducationDto } from './dto/update-candidate-education.dto.js';
import { CreateCandidateCertificationDto } from './dto/create-candidate-certification.dto.js';
import { UpdateCandidateCertificationDto } from './dto/update-candidate-certification.dto.js';

@ApiTags('Candidate')
@ApiBearerAuth()
@Controller('candidate')
@Roles(UserRole.CANDIDATE)
export class CandidateController {
  constructor(private readonly service: CandidateService) {}
  @Get('profile') getProfile(@CurrentUser() user: { sub: string }) {
    return this.service.getProfile(user.sub);
  }
  @Post('profile') createProfile(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateCandidateProfileDto,
  ) {
    return this.service.createProfile(user.sub, dto);
  }
  @Patch('profile') updateProfile(
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateCandidateProfileDto,
  ) {
    return this.service.updateProfile(user.sub, dto);
  }
  @Get('experience') listExperience(@CurrentUser() user: { sub: string }) {
    return this.service.listExperiences(user.sub);
  }
  @Post('experience') createExperience(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateCandidateExperienceDto,
  ) {
    return this.service.createExperience(user.sub, dto);
  }
  @Patch('experience/:id') updateExperience(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateExperienceDto,
  ) {
    return this.service.updateExperience(user.sub, id, dto);
  }
  @Delete('experience/:id') deleteExperience(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteExperience(user.sub, id);
  }
  @Get('education') listEducation(@CurrentUser() user: { sub: string }) {
    return this.service.listEducation(user.sub);
  }
  @Post('education') createEducation(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateCandidateEducationDto,
  ) {
    return this.service.createEducation(user.sub, dto);
  }
  @Patch('education/:id') updateEducation(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateEducationDto,
  ) {
    return this.service.updateEducation(user.sub, id, dto);
  }
  @Delete('education/:id') deleteEducation(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteEducation(user.sub, id);
  }
  @Get('certifications') listCertifications(
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.listCertifications(user.sub);
  }
  @Post('certifications') createCertification(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateCandidateCertificationDto,
  ) {
    return this.service.createCertification(user.sub, dto);
  }
  @Patch('certifications/:id') updateCertification(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateCertificationDto,
  ) {
    return this.service.updateCertification(user.sub, id, dto);
  }
  @Delete('certifications/:id') deleteCertification(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteCertification(user.sub, id);
  }
}
