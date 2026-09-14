export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  },
  auth: {
    refreshCookieName: process.env.AUTH_REFRESH_COOKIE_NAME ?? 'ng_refresh',
    refreshExpiresInDays: Number(
      process.env.AUTH_REFRESH_EXPIRES_IN_DAYS ?? 30,
    ),
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
});
