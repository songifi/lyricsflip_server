import { registerAs } from '@nestjs/config';

export default registerAs('production', () => ({
  NODE_ENV: 'production',
  PORT: process.env.PORT || 8080,
  DATABASE_URL: process.env.DATABASE_URL,
  }));

