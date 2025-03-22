
import { Controller, Get, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ContentDiscoveryService } from '../services/content-discovery.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('discovery')
@Controller('discovery')
export class ContentDiscoveryController {
  private readonly logger = new Logger(ContentDiscoveryController.name);

  constructor(private readonly contentDiscoveryService: ContentDiscoveryService) {}

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized content recommendations' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations to return' })
  @ApiResponse({
    status: 200,
    description: 'Personalized content recommendations',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          creator: { 
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              name: { type: 'string' },
              avatar: { type: 'string' }
            }
          },
          popularityScore: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  async getRecommendations(
    @CurrentUser() userId: string,
    @Query('limit') limit?: number
  ) {
    return this.contentDiscoveryService.getPersonalizedRecommendations(
      userId, 
      limit ? Math.min(limit, 50) : 20 // Cap at 50 items
    );
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending content across the platform' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of trending items to return' })
  @ApiResponse({
    status: 200,
    description: 'Trending content',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          creator: { 
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              name: { type: 'string' },
              avatar: { type: 'string' }
            }
          },
          trendingScore: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  async getTrending(@Query('limit') limit?: number) {
    return this.contentDiscoveryService.getTrendingContent(
      limit ? Math.min(limit, 50) : 20 // Cap at 50 items
    );
  }

  @Get('network/trending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trending content within your network' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of trending items to return' })
  @ApiResponse({
    status: 200,
    description: 'Network trending content',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          creator: { 
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              name: { type: 'string' },
              avatar: { type: 'string' }
            }
          },
          trendingScore: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  async getNetworkTrending(
    @CurrentUser() userId: string,
    @Query('limit') limit?: number
  ) {
    return this.contentDiscoveryService.getNetworkTrending(
      userId, 
      limit ? Math.min(limit, 50) : 20 // Cap at 50 items
    );
  }

  @Get('people-suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get "People you may know" suggestions' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of suggestions to return' })
  @ApiResponse({
    status: 200,
    description: 'People suggestions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          name: { type: 'string' },
          avatar: { type: 'string' },
          bio: { type: 'string' },
          connectionStrength: { type: 'number' }
        }
      }
    }
  })
  async getPeopleSuggestions(
    @CurrentUser() userId: string,
    @Query('limit') limit?: number
  ) {
    return this.contentDiscoveryService.getPeopleYouMayKnow(
      userId, 
      limit ? Math.min(limit, 50) : 20 // Cap at 50 items
    );
  }

  @Get('enhance-search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enhance search results with social signals' })
  @ApiQuery({ name: 'query', required: true, type: String, description: 'Search query' })
  @ApiQuery({ name: 'results', required: true, type: String, description: 'JSON string of search results' })
  @ApiResponse({
    status: 200,
    description: 'Enhanced search results',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          creator: { 
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              name: { type: 'string' },
              avatar: { type: 'string' }
            }
          },
          _enhancedScore: { type: 'number' }
        }
      }
    }
  })
  async enhanceSearch(
    @CurrentUser() userId: string,
    @Query('query') query: string,
    @Query('results') resultsJson: string
  ) {
    try {
      const results = JSON.parse(resultsJson);
      return this.contentDiscoveryService.enhanceSearchResults(userId, results, query);
    } catch (error) {
      this.logger.error(`Error enhancing search results: ${error.message}`, error.stack);
      throw new Error('Invalid search results format');
    }
  }
}