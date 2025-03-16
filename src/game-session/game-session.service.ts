import { Injectable } from '@nestjs/common';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { UpdateGameSessionDto } from './dto/update-game-session.dto';

@Injectable()
export class GameSessionService {
  create(createGameSessionDto: CreateGameSessionDto) {
    return 'This action adds a new gameSession';
  }

  findAll() {
    return `This action returns all gameSession`;
  }

  findOne(id: number) {
    return `This action returns a #${id} gameSession`;
  }

  update(id: number, updateGameSessionDto: UpdateGameSessionDto) {
    return `This action updates a #${id} gameSession`;
  }

  remove(id: number) {
    return `This action removes a #${id} gameSession`;
  }
}
