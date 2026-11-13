import { describe, expect, it } from 'vitest';
import configuration from './configuration.js';

describe('configuration', () => {
  it('loads local storage configuration with project-local defaults', () => {
    const previous = {
      provider: process.env.STORAGE_PROVIDER,
      localRootPath: process.env.STORAGE_LOCAL_PATH,
      publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
      endpoint: process.env.STORAGE_ENDPOINT,
      region: process.env.STORAGE_REGION,
      accessKey: process.env.STORAGE_ACCESS_KEY,
      secretKey: process.env.STORAGE_SECRET_KEY,
      bucket: process.env.STORAGE_BUCKET,
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE,
      expires: process.env.STORAGE_PRESIGNED_URL_EXPIRES_SECONDS,
    };
    process.env.STORAGE_PROVIDER = 'local';
    process.env.STORAGE_LOCAL_PATH = './storage';
    process.env.STORAGE_PUBLIC_BASE_URL = 'http://localhost:3000/storage';
    delete process.env.STORAGE_ENDPOINT;
    delete process.env.STORAGE_REGION;
    delete process.env.STORAGE_ACCESS_KEY;
    delete process.env.STORAGE_SECRET_KEY;
    delete process.env.STORAGE_BUCKET;
    delete process.env.STORAGE_FORCE_PATH_STYLE;
    delete process.env.STORAGE_PRESIGNED_URL_EXPIRES_SECONDS;

    try {
      expect(configuration().storage).toEqual({
        provider: 'local',
        endpoint: undefined,
        region: 'us-east-1',
        accessKey: undefined,
        secretKey: undefined,
        bucket: undefined,
        localRootPath: './storage',
        publicBaseUrl: 'http://localhost:3000/storage',
        forcePathStyle: true,
        presignedUrlExpiresSeconds: 300,
      });
    } finally {
      process.env.STORAGE_PROVIDER = previous.provider;
      process.env.STORAGE_LOCAL_PATH = previous.localRootPath;
      process.env.STORAGE_PUBLIC_BASE_URL = previous.publicBaseUrl;
      process.env.STORAGE_ENDPOINT = previous.endpoint;
      process.env.STORAGE_REGION = previous.region;
      process.env.STORAGE_ACCESS_KEY = previous.accessKey;
      process.env.STORAGE_SECRET_KEY = previous.secretKey;
      process.env.STORAGE_BUCKET = previous.bucket;
      process.env.STORAGE_FORCE_PATH_STYLE = previous.forcePathStyle;
      process.env.STORAGE_PRESIGNED_URL_EXPIRES_SECONDS = previous.expires;
    }
  });
});
