import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { CandidateDocumentController } from './candidate-document.controller.js';
import { CandidateDocumentService } from './candidate-document.service.js';

@Module({
  imports: [StorageModule],
  controllers: [CandidateDocumentController],
  providers: [CandidateDocumentService],
})
export class CandidateDocumentModule {}
