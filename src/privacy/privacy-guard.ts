// src/privacy/guards/privacy.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrivacyService } from '../privacy.service';

// Define metadata keys for our privacy decorators
export const REQUIRES_PROFILE_ACCESS = 'requires_profile_access';
export const REQUIRES_CONTENT_ACCESS = 'requires_content_access';
export const REQUIRES_DIRECT_MESSAGE_ACCESS = 'requires_direct_message_access';

@Injectable()
export class PrivacyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private privacyService: PrivacyService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get metadata from handler and controller
    const requiresProfileAccess = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_PROFILE_ACCESS,
      [context.getHandler(), context.getClass()]
    );

    const requiresContentAccess = this.reflector.getAllAndOverride<string>(
      REQUIRES_CONTENT_ACCESS,
      [context.getHandler(), context.getClass()]
    );

    const requiresDirectMessageAccess = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_DIRECT_MESSAGE_ACCESS,
      [context.getHandler(), context.getClass()]
    );

    // If no privacy requirements, allow access
    if (!requiresProfileAccess && !requiresContentAccess && !requiresDirectMessageAccess) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const currentUser = request.user;
    
    // Get target user ID either from params (for profiles) or from the entity (for content)
    let targetUserId: string;
    
    if (requiresProfileAccess) {
      targetUserId = request.params.userId || request.params.id;
    } else if (requiresContentAccess) {
      // For posts, comments, etc. we need to get the entity first
      // This usually happens in a middleware or interceptor before this guard
      const contentType = requiresContentAccess; // e.g., 'post'
      const entityId = request.params.id;
      
      // This is simplified - you'd need logic to load the entity and get its creator
      const entity = request[`${contentType}Entity`];
      if (!entity) {
        throw new ForbiddenException('Access denied');
      }
      
      targetUserId = entity.authorId || entity.createdBy;
    } else if (requiresDirectMessageAccess) {
      targetUserId = request.params.recipientId;
    }

    if (!targetUserId) {
      throw new ForbiddenException('Access denied - target user not identified');
    }

    const currentUserId = currentUser?.id || null;

    // Perform the appropriate privacy check
    let hasAccess = false;

    if (requiresProfileAccess) {
      hasAccess = await this.privacyService.canViewProfile(currentUserId, targetUserId);
    } else if (requiresContentAccess) {
      const contentType = requiresContentAccess === 'post' ? 'post' : 'message';
      hasAccess = await this.privacyService.canViewContent(currentUserId, targetUserId, contentType);
    } else if (requiresDirectMessageAccess) {
      hasAccess = await this.privacyService.canSendDirectMessage(currentUserId, targetUserId);
    }

    if (!hasAccess) {
      throw new ForbiddenException('Access denied based on privacy settings');
    }

    return true;
  }
}
