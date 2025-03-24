import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { BlockService } from './block.service';

/**
 * Middleware to prevent interactions between users who have blocked each other
 */
@Injectable()
export class BlockMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BlockMiddleware.name);

  constructor(private readonly blockService: BlockService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Get current authenticated user from request
      const currentUser = req.user as { id: string };
      
      if (!currentUser) {
        return next();
      }
      
      // Get target user ID from request
      // This would need to be adapted based on your route patterns
      const targetUserId = this.extractTargetUserId(req);
      
      if (!targetUserId || currentUser.id === targetUserId) {
        return next();
      }
      
      // Check if either user has blocked the other
      const hasAnyBlock = await this.blockService.hasAnyBlock(
        currentUser.id,
        targetUserId
      );
      
      if (hasAnyBlock) {
        throw new ForbiddenException('This interaction is not allowed');
      }
      
      next();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Error in block middleware: ${error.message}`, error.stack);
      next(error);
    }
  }

  /**
   * Extract target user ID from request
   * This needs to be adapted based on your API route patterns
   */
  private extractTargetUserId(req: Request): string | null {
    // From route params
    if (req.params.userId) {
      return req.params.userId;
    }
    
    if (req.params.targetUserId) {
      return req.params.targetUserId;
    }
    
    // From query string
    if (req.query.userId) {
      return req.query.userId as string;
    }
    
    // From request body
    if (req.body && req.body.userId) {
      return req.body.userId;
    }
    
    if (req.body && req.body.targetUserId) {
      return req.body.targetUserId;
    }
    
    return null;
  }
}
