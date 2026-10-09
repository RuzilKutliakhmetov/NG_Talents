import { describe, expect, it } from 'vitest';
import configuration from './configuration.js';

describe('configuration', () => {
  it('loads storage configuration without exposing defaults for secrets', () => {
    const previous = {
      endpoint: process.env.STORAGE_ENDPOINT,
      region: process.env.STORAGE_REGION,
      accessKey: process.env.STORAGE_ACCESS_KEY,
      secretKey: process.env.STORAGE_SECRET_KEY,
      bucket: process.env.STORAGE_BUCKET,
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE,
      expires: process.env.STORAGE_PRESIGNED_URL_EXPIRES_SECONDS,
    };
    process.env.STORAGE_ENDPOINT = 'http://localhost:9000';
    process.env.STORAGE_REGION = 'us-east-1';
    process.env.STORAGE_ACCESS_KEY = 'access';
    process.env.STORAGE_SECRET_KEY = 'secret';
    process.env.STORAGE_BUCKET = 'ngtalents';
    delete process.env.STORAGE_FORCE_PATH_STYLE;
    delete process.env.STORAGE_PRESIGNED_URL_EXPIRES_SECONDS;

    try {
      expect(configuration().storage).toEqual({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        accessKey: 'access',
        secretKey: 'secret',
        bucket: 'ngtalents',
        forcePathStyle: true,
        presignedUrlExpiresSeconds: 300,
      });
    } finally {
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
