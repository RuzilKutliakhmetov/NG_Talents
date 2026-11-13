import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './env.validation.js';

const validEnvironment = {
  DATABASE_URL: 'postgresql://localhost/db',
  JWT_ACCESS_SECRET: 'secret',
  STORAGE_PROVIDER: 'local',
  STORAGE_PRESIGNED_URL_EXPIRES_SECONDS: '300',
};

describe('validateEnvironment', () => {
  it('accepts complete local storage configuration', () => {
    expect(validateEnvironment(validEnvironment)).toEqual(validEnvironment);
  });

  it('fails clearly when S3 storage configuration is missing', () => {
    const { STORAGE_PROVIDER: _provider, ...missingProvider } = validEnvironment;

    expect(() =>
      validateEnvironment({
        ...missingProvider,
        STORAGE_PROVIDER: 's3',
      }),
    ).toThrow('Missing required environment variable: STORAGE_ENDPOINT');
  });

  it('rejects an invalid presigned URL expiry', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        STORAGE_PRESIGNED_URL_EXPIRES_SECONDS: '0',
      }),
    ).toThrow(
      'STORAGE_PRESIGNED_URL_EXPIRES_SECONDS must be a positive integer',
    );
  });
});
