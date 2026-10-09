export function validateEnvironment(config: Record<string, unknown>) {
  const required = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'STORAGE_ENDPOINT',
    'STORAGE_ACCESS_KEY',
    'STORAGE_SECRET_KEY',
    'STORAGE_BUCKET',
  ];
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const port = Number(config.PORT ?? 3000);
  const redisPort = Number(config.REDIS_PORT ?? 6379);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }
  if (!Number.isInteger(redisPort) || redisPort < 1 || redisPort > 65535) {
    throw new Error('REDIS_PORT must be a valid TCP port');
  }
  const storageExpiry = Number(
    config.STORAGE_PRESIGNED_URL_EXPIRES_SECONDS ?? 300,
  );
  if (!Number.isInteger(storageExpiry) || storageExpiry < 1) {
    throw new Error(
      'STORAGE_PRESIGNED_URL_EXPIRES_SECONDS must be a positive integer',
    );
  }
  return config;
}
