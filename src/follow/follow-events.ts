import { User } from '../user/user.entity';
import { Follow } from './follow.entity';
import { FollowRequest, FollowRequestStatus } from './follow-request.entity';

export class UserFollowedEvent {
  constructor(
    public readonly followerId: string,
    public readonly followingId: string,
    public readonly follow: Follow
  ) {}
}

export class UserUnfollowedEvent {
  constructor(
    public readonly followerId: string,
    public readonly followingId: string
  ) {}
}

export class FollowRequestCreatedEvent {
  constructor(
    public readonly followRequest: FollowRequest
  ) {}
}

export class FollowRequestApprovedEvent {
  constructor(
    public readonly followRequest: FollowRequest,
    public readonly follow: Follow
  ) {}
}

export class FollowRequestRejectedEvent {
  constructor(
    public readonly followRequest: FollowRequest
  ) {}
}

export class FollowRequestCanceledEvent {
  constructor(
    public readonly requesterId: string,
    public readonly recipientId: string
  ) {}
}

export class FollowCountUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly followerCount: number,
    public readonly followingCount: number
  ) {}
}

export class FollowRateLimitExceededEvent {
  constructor(
    public readonly userId: string,
    public readonly targetUserId: string
  ) {}
}
