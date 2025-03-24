import { User } from '../user/user.entity';
import { Block } from './block.entity';

export class UserBlockedEvent {
  constructor(
    public readonly blockerId: string,
    public readonly blockedId: string,
    public readonly block: Block
  ) {}
}

export class UserUnblockedEvent {
  constructor(
    public readonly blockerId: string,
    public readonly blockedId: string
  ) {}
}

export class BlockListUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly blockCount: number
  ) {}
}
