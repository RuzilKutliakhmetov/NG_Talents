import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller.js';
import {
  EmployerVacancyController,
  VacancyController,
} from './vacancy.controller.js';
import { VacancyService } from './vacancy.service.js';

@Module({
  controllers: [
    VacancyController,
    EmployerVacancyController,
    ModerationController,
  ],
  providers: [VacancyService],
})
export class VacancyModule {}
