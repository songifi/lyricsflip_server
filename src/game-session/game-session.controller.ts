import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { UpdateGameSessionDto } from './dto/update-game-session.dto';

@Controller('game-session')
export class GameSessionController {
  constructor(private readonly gameSessionService: GameSessionService) {}

  @Post()
  create(@Body() createGameSessionDto: CreateGameSessionDto, @Param('userId') userId: string) {
    return this.gameSessionService.create(userId, createGameSessionDto);
  }

  @Get()
  findAll() {
    return this.gameSessionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gameSessionService.findOne(id);
  }

  @Patch(':id')
  update(@Param('userId') userId: string, @Param('id') id: string, @Body() updateGameSessionDto: UpdateGameSessionDto) {
    return this.gameSessionService.update(userId, id, updateGameSessionDto);
  }

  @Delete(':id')
  remove(@Param('userId') userId: string, @Param('id') id: string) {
    return this.gameSessionService.remove(userId, id);
  }
}
