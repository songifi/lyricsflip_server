import { GameRound, GameRoundStatus } from './game-round.entity';

export class GameRoundCreatedEvent {
  constructor(public readonly gameRound: GameRound) {}
}

export class GameRoundUpdatedEvent {
  constructor(
    public readonly gameRound: GameRound,
    public readonly previousState?: Partial<GameRound>
  ) {}
}

export class GameRoundStatusChangedEvent {
  constructor(
    public readonly gameRound: GameRound,
    public readonly previousStatus: GameRoundStatus
  ) {}
}

export class GameRoundStartedEvent {
  constructor(public readonly gameRound: GameRound) {}
}

export class GameRoundCompletedEvent {
  constructor(public readonly gameRound: GameRound) {}
}

export class GameRoundDeletedEvent {
  constructor(public readonly gameRoundId: string) {}
}

export class ParticipantJoinedGameRoundEvent {
  constructor(
    public readonly gameRound: GameRound,
    public readonly userId: string
  ) {}
}

export class ParticipantLeftGameRoundEvent {
  constructor(
    public readonly gameRound: GameRound,
    public readonly userId: string
  ) {}
}
