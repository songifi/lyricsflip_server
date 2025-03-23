import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { GameRoundService } from './game-round.service';
import {
  CreateGameRoundDto,
  UpdateGameRoundDto,
  GameRoundFilterDto,
  ChangeGameRoundStatusDto,
} from './game-round.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/user.entity';

@ApiTags('game-rounds')
@Controller('game-rounds')
export class GameRoundController {
  constructor(private readonly gameRoundService: GameRoundService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new game round' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'The game round has been successfully created.' 
  })
  create(@Body() createGameRoundDto: CreateGameRoundDto, @GetUser() user: User) {
    return this.gameRoundService.create(createGameRoundDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Find all game rounds with filtering' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns all game rounds matching the filter criteria.' 
  })
  findAll(@Query() filterDto: GameRoundFilterDto) {
    return this.gameRoundService.findAll(filterDto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active game rounds with player counts' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns all active game rounds with player counts.' 
  })
  getActiveRounds() {
    return this.gameRoundService.getActiveGamesWithPlayerCount();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find a game round by ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns the game round with the specified ID.' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Game round not found.' 
  })
  findOne(@Param('id') id: string) {
    return this.gameRoundService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a game round' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'The game round has been successfully updated.' 
  })
  update(
    @Param('id') id: string,
    @Body() updateGameRoundDto: UpdateGameRoundDto,
    @GetUser() user: User,
  ) {
    return this.gameRoundService.update(id, updateGameRoundDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a game round' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'The game round has been successfully deleted.' 
  })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.gameRoundService.remove(id, user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change game round status' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'The game round status has been successfully changed.' 
  })
  changeStatus(
    @Param('id') id: string,
    @Body() changeStatusDto: ChangeGameRoundStatusDto,
    @GetUser() user: User,
  ) {
    return this.gameRoundService.changeStatus(id, changeStatusDto, user);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a game round' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'The game round has been successfully started.' 
  })
  startRound(@Param('id') id: string, @GetUser() user: User) {
    return this.gameRoundService.startRound(id, user);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a game round' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'The game round has been successfully completed.' 
  })
  completeRound(@Param('id') id: string, @GetUser() user: User) {
    return this.gameRoundService.completeRound(id, user);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Join a game round' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Successfully joined the game round.' 
  })
  joinRound(@Param('id') id: string, @GetUser() user: User) {
    return this.gameRoundService.joinRound(id, user);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave a game round' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Successfully left the game round.' 
  })
  leaveRound(@Param('id') id: string, @GetUser() user: User) {
    return this.gameRoundService.leaveRound(id, user);
  }

  @Get(':id/results')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get game round results and statistics' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns the results and statistics for the completed game round.' 
  })
  getRoundResults(@Param('id') id: string) {
    return this.gameRoundService.processRoundResults(id);
  }
}
