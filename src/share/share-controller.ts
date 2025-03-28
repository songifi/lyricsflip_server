// src/shares/share.controller.ts

import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Req, 
  Ip, 
  Headers 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShareService } from './share.service';
import { 
  CreateShareDto, 
  ShareDto, 
  ShareFilterDto, 
  ShareAnalyticsDto, 
  GenerateEmbedDto 
} from './dto/share.dto';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('shares')
@Controller('shares')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new share' })
  @ApiResponse({ status: 201, description: 'The share has been successfully created', type: ShareDto })
  @RateLimit({ limit: 10, duration: 60 }) // 10 shares per minute
  async createShare(@Req() req, @Body() createShareDto: CreateShareDto): Promise<ShareDto> {
    return this.shareService.createShare(req.user.id, createShareDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shares with filtering options' })
  @ApiResponse({ status: 200, description: 'Returns all shared content based on filters', type: [ShareDto] })
  async findSharedContent(@Query() filters: ShareFilterDto): Promise<ShareDto[]> {
    return this.shareService.findSharedContent(filters);
  }

  @Get('activity')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get share activity feed for current user' })
  @ApiResponse({ status: 200, description: 'Returns share activity feed', type: [ShareDto] })
  async getShareActivityFeed(
    @Req() req, 
    @Query('limit') limit: number = 10, 
    @Query('offset') offset: number = 0
  ): Promise<ShareDto[]> {
    return this.shareService.getShareActivityFeed(req.user.id, limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get share by ID' })
  @ApiResponse({ status: 200, description: 'Returns the share object', type: ShareDto })
  @ApiResponse({ status: 404, description: 'Share not found' })
  async findOne(@Param('id') id: string): Promise<ShareDto> {
    const share = await this.shareService.findById(id);
    return this.shareService.mapToDto(share);
  }

  @Get(':id/analytics')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics for a share' })
  @ApiResponse({ status: 200, description: 'Returns share analytics', type: ShareAnalyticsDto })
  @ApiResponse({ status: 404, description: 'Share not found' })
  async getShareAnalytics(@Param('id') id: string): Promise<ShareAnalyticsDto> {
    return this.shareService.getShareAnalytics(id);
  }

  @Post(':id/embed')
  @ApiOperation({ summary: 'Generate embed code for a share' })
  @ApiResponse({ status: 200, description: 'Returns HTML embed code' })
  @ApiResponse({ status: 404, description: 'Share not found' })
  async generateEmbed(@Body() embedDto: GenerateEmbedDto): Promise<{ embedCode: string }> {
    const embedCode = await this.shareService.generateEmbedCode(embedDto.shareId);
    return { embedCode };
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Record a view for a share' })
  @ApiResponse({ status: 200, description: 'View recorded successfully' })
  @ApiResponse({ status: 404, description: 'Share not found' })
  async recordView(
    @Param('id') id: string,
    @Ip() ip: string,
    @Headers('referer') referer: string
  ): Promise<void> {
    await this.shareService.recordShareView(id, ip, referer);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a share' })
  @ApiResponse({ status: 200, description: 'Share deleted successfully' })
  @ApiResponse({ status: 404, description: 'Share not found' })
  async deleteShare(@Req() req, @Param('id') id: string): Promise<void> {
    await this.shareService.deleteShare(req.user.id, id);
  }
}

// src/common/services/rate-limiter.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Check if the operation is rate limited
   * @param key Unique key for the rate limited operation
   * @param limit Maximum number of operations allowed
   * @param duration Duration in seconds for the rate limit window
   */
  async checkRateLimit(key: string, limit: number, duration: number): Promise<void> {
    const redis = this.redisService.getClient();
    
    const current = await redis.incr(key);
    
    // If this is the first request, set an expiry
    if (current === 1) {
      await redis.expire(key, duration);
    }
    
    if (current > limit) {
      this.logger.warn(`Rate limit exceeded for ${key}`);
      throw new ThrottlerException(`Rate limit exceeded. Try again in ${duration} seconds`);
    }
  }
}

// src/common/services/preview-generator.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from './s3.service';
import * as puppeteer from 'puppeteer';
import { Content } from '../../content/entities/content.entity';

@Injectable()
export class PreviewGeneratorService {
  private readonly logger = new Logger(PreviewGeneratorService.name);
  
  constructor(private readonly s3Service: S3Service) {}
  
  /**
   * Generate a preview image for content
   */
  async generatePreview(content: Content): Promise<string> {
    try {
      // Launch headless browser
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
      const page = await browser.newPage();
      
      // Set viewport size
      await page.setViewport({ width: 1200, height: 630 });
      
      // Create a preview based on content type
      let screenshotBuffer: Buffer;
      
      switch (content.type) {
        case 'URL':
          // Navigate to URL and take screenshot
          await page.goto(content.url, { waitUntil: 'networkidle2' });
          screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 80 });
          break;
          
        case 'TEXT':
        case 'HTML':
          // Generate a preview card with content text
          await page.setContent(`
            <html>
              <head>
                <style>
                  body {
                    margin: 0;
                    padding: 40px;
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    height: 100vh;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                  }
                  .card {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    padding: 30px;
                    max-height: 500px;
                    overflow: hidden;
                  }
                  h1 {
                    margin-top: 0;
                    color: #333;
                    font-size: 28px;
                  }
                  p {
                    color: #666;
                    line-height