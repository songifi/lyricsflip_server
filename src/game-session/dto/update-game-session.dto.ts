import { PartialType } from '@nestjs/swagger';
import { CreateGameSessionDto } from './create-game-session.dto';

export class UpdateGameSessionDto extends PartialType(CreateGameSessionDto) {}
