import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { ResumeController } from './resume.controller.js';
import { ResumeService } from './resume.service.js';

@Module({
  imports: [StorageModule],
  controllers: [ResumeController],
  providers: [ResumeService],
})
export class ResumeModule {}
