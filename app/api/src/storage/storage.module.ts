import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'node:path';
import { LocalStorageAdapter } from './local-storage.adapter.js';
import { S3StorageAdapter } from './s3-storage.adapter.js';
import { StorageController } from './storage.controller.js';
import { StorageService } from './storage.service.js';
import { STORAGE_PORT } from './storage.tokens.js';

@Module({
  controllers: [StorageController],
  providers: [
    {
      provide: STORAGE_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider =
          String(config.get<string>('storage.provider') ?? 'local').toLowerCase();

        if (provider === 'local') {
          return new LocalStorageAdapter({
            rootDir:
              config.get<string>('storage.localRootPath') ??
              path.resolve(process.cwd(), 'storage'),
            publicBaseUrl:
              config.get<string>('storage.publicBaseUrl') ??
              'http://localhost:3000/storage',
            presignedUrlExpiresSeconds:
              config.get<number>('storage.presignedUrlExpiresSeconds') ?? 300,
          });
        }

        return new S3StorageAdapter({
          endpoint: config.getOrThrow<string>('storage.endpoint'),
          region: config.getOrThrow<string>('storage.region'),
          accessKey: config.getOrThrow<string>('storage.accessKey'),
          secretKey: config.getOrThrow<string>('storage.secretKey'),
          bucket: config.getOrThrow<string>('storage.bucket'),
          forcePathStyle: config.get<boolean>('storage.forcePathStyle') ?? true,
          presignedUrlExpiresSeconds:
            config.get<number>('storage.presignedUrlExpiresSeconds') ?? 300,
        });
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule implements OnModuleInit {
  constructor(
    @Inject(STORAGE_PORT)
    private readonly storage: S3StorageAdapter | LocalStorageAdapter,
  ) {}

  async onModuleInit() {
    if ('initializeBucket' in this.storage) {
      await this.storage.initializeBucket();
    }
    if ('checkHealth' in this.storage) {
      await this.storage.checkHealth();
    }
  }
}
