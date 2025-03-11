import { registerAs } from '@nestjs/config';

export default registerAs('test', () => ({
  NODE_ENV: 'test',
  PORT: 4000, // Using a different port to avoid conflicts with development port
  DATABASE_URL: 'mongodb://localhost:27017/lyricsflip-test', // Using a separate test database
}));
