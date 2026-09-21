import { Module } from '@nestjs/common';
import { EmployerController } from './employer.controller.js';
import { EmployerService } from './employer.service.js';

@Module({ controllers: [EmployerController], providers: [EmployerService] })
export class EmployerModule {}
