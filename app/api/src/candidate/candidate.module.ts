import { Module } from '@nestjs/common';
import { CandidateController } from './candidate.controller.js';
import { CandidateService } from './candidate.service.js';

@Module({ controllers: [CandidateController], providers: [CandidateService] })
export class CandidateModule {}
