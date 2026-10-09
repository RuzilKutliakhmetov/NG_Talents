import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { CandidateModule } from './candidate/candidate.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import configuration from './config/configuration.js';
import { validateEnvironment } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { VacancyModule } from './vacancy/vacancy.module.js';
import { EmployerModule } from './employer/employer.module.js';
import { ApplicationModule } from './application/application.module.js';
import { ResumeModule } from './resume/resume.module.js';
import { CandidateDocumentModule } from './candidate-document/candidate-document.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    CandidateModule,
    EmployerModule,
    VacancyModule,
    ApplicationModule,
    ResumeModule,
    CandidateDocumentModule,
    StorageModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
