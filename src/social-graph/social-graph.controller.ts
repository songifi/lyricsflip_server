import { 
    Controller, 
    Get, 
    Param, 
    Query, 
    UseGuards, 
    HttpStatus,
  } from '@nestjs/common';
  import { 
    ApiTags, 
    ApiOperation, 
    ApiResponse, 
    ApiBearerAuth, 
    ApiParam, 
    ApiQuery,
  } from '@nestjs/swagger';
  
  import { SocialGraphService } from './social-graph.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../auth/decorators/current-user.decorator';
  
  @ApiTags('social-graph')
  @Controller('social-graph')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  export class SocialGraphController {
    constructor(private readonly socialGraphService: SocialGraphService) {}
  
    @Get('connection-strength/:targetId')
    @ApiOperation({ summary: 'Get connection strength between current user and target user' })
    @ApiParam({ name: 'targetId', description: 'ID of target user' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Connection strength retrieved successfully',
    })
    async getConnectionStrength(
      @CurrentUser('sub') userId: string,
      @Param('targetId') targetId: string,
    ) {
      return this.socialGraphService.getConnectionStrength(userId, targetId);
    }
  
    @Get('mutual-connections/:targetId')
    @ApiOperation({ summary: 'Get mutual connections between current user and target user' })
    @ApiParam({ name: 'targetId', description: 'ID of target user' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Mutual connections retrieved successfully',
    })
    async getMutualConnections(
      @CurrentUser('sub') userId: string,
      @Param('targetId') targetId: string,
    ) {
      return this.socialGraphService.getMutualConnections(userId, targetId);
    }
  
    @Get('suggestions')
    @ApiOperation({ summary: 'Get connection suggestions for current user' })
    @ApiQuery({ 
      name: 'limit', 
      description: 'Maximum number of suggestions to return', 
      required: false,
      type: Number,
    })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Connection suggestions retrieved successfully',
    })
    async getConnectionSuggestions(
      @CurrentUser('sub') userId: string,
      @Query('limit') limit?: number,
    ) {
      return this.socialGraphService.getConnectionSuggestions(userId, limit);
    }
  
    @Get('visualization')
    @ApiOperation({ summary: 'Get network visualization data for current user' })
    @ApiQuery({ 
      name: 'depth', 
      description: 'Depth of network to include (1-3)', 
      required: false,
      type: Number,
    })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Network visualization data retrieved successfully',
    })
    async getNetworkVisualization(
      @CurrentUser('sub') userId: string,
      @Query('depth') depth?: number,
    ) {
      // Limit depth to reasonable values
      const safeDepth = Math.min(Math.max(1, depth || 2), 3);
      return this.socialGraphService.getNetworkVisualizationData(userId, safeDepth);
    }
  
    @Get('community')
    @ApiOperation({ summary: 'Get community information for current user' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Community information retrieved successfully',
    })
    async getUserCommunity(@CurrentUser('sub') userId: string) {
      return this.socialGraphService.getUserCommunity(userId);
    }
  }
  