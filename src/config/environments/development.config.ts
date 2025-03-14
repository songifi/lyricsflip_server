import { registerAs } from '@nestjs/config';

export default registerAs('development', () => ({
  NODE_ENV: 'development',
  PORT: 3000,
  DATABASE_URL: 'mongodb://localhost:27017/lyricsflip-dev',
  }));

