import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getDatabaseUrl();
  }

  @Get('/health')
  async healthCheck(): Promise<{ status: string }> {
    const status = await this.appService.checkDatabaseConnection();
    return { status };
  }
}
