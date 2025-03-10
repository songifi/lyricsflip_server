import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AppService {
  constructor(
    private configService: ConfigService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  getDatabaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL') ?? '';
  }

  async checkDatabaseConnection(): Promise<string> {
    return this.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  }
}
