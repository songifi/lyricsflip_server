import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { SessionStatus } from 'src/enum/game-session.enum';
import { User } from 'src/schemas/user.schema';

export class CreateGameSessionDto {
  @IsInt()
  sessionId: number;

  @IsNotEmpty()
  createdBy: User;

  @IsEnum(SessionStatus)
  status: SessionStatus;

  @IsArray()
  @IsString({ each: true })
  players: string[];

  @IsString()
  config: string;

  @IsDate()
  createdAt: Date;
}
