import { Module } from '@nestjs/common';
import { ApplicationController } from './application.controller.js';
import { EmployerApplicationController } from './employer-application.controller.js';
import { ApplicationService } from './application.service.js';

@Module({
  controllers: [ApplicationController, EmployerApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
