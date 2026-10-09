import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3StorageAdapter } from './s3-storage.adapter.js';
import { StorageService } from './storage.service.js';
import { STORAGE_PORT } from './storage.tokens.js';

@Module({
  providers: [
    {
      provide: STORAGE_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new S3StorageAdapter({
          endpoint: config.getOrThrow<string>('storage.endpoint'),
          region: config.getOrThrow<string>('storage.region'),
          accessKey: config.getOrThrow<string>('storage.accessKey'),
          secretKey: config.getOrThrow<string>('storage.secretKey'),
          bucket: config.getOrThrow<string>('storage.bucket'),
          forcePathStyle: config.get<boolean>('storage.forcePathStyle') ?? true,
          presignedUrlExpiresSeconds:
            config.get<number>('storage.presignedUrlExpiresSeconds') ?? 300,
        }),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule implements OnModuleInit {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: S3StorageAdapter,
  ) {}

  onModuleInit() {
    return this.storage.initializeBucket();
  }
}
