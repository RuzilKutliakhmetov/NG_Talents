import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './env.validation.js';

const validEnvironment = {
  DATABASE_URL: 'postgresql://localhost/db',
  JWT_ACCESS_SECRET: 'secret',
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_ACCESS_KEY: 'access',
  STORAGE_SECRET_KEY: 'secret',
  STORAGE_BUCKET: 'ngtalents',
  STORAGE_PRESIGNED_URL_EXPIRES_SECONDS: '300',
};

describe('validateEnvironment', () => {
  it('accepts complete storage configuration', () => {
    expect(validateEnvironment(validEnvironment)).toEqual(validEnvironment);
  });

  it('fails clearly when storage configuration is missing', () => {
    const { STORAGE_SECRET_KEY: _secret, ...missingSecret } = validEnvironment;

    expect(() => validateEnvironment(missingSecret)).toThrow(
      'Missing required environment variable: STORAGE_SECRET_KEY',
    );
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
