import { RoundAnswer, AnswerStatus } from './round-answer.entity';

export class AnswerSubmittedEvent {
  constructor(public readonly answer: RoundAnswer) {}
}

export class AnswerUpdatedEvent {
  constructor(
    public readonly answer: RoundAnswer,
    public readonly previousText: string,
    public readonly reason?: string
  ) {}
}

export class AnswerValidatedEvent {
  constructor(
    public readonly answer: RoundAnswer,
    public readonly previousStatus: AnswerStatus
  ) {}
}

export class AnswerDeletedEvent {
  constructor(
    public readonly answerId: string,
    public readonly userId: string,
    public readonly roundId: string
  ) {}
}

export class BulkAnswersValidatedEvent {
  constructor(
    public readonly answerIds: string[],
    public readonly status: AnswerStatus,
    public readonly validatedBy: string
  ) {}
}

export class AnswerRateLimitExceededEvent {
  constructor(
    public readonly userId: string,
    public readonly roundId: string,
    public readonly attemptCount: number
  ) {}
}

export class InvalidAnswerSubmittedEvent {
  constructor(
    public readonly userId: string,
    public readonly roundId: string,
    public readonly attemptedAnswer: string,
    public readonly validationErrors: string[]
  ) {}
}
