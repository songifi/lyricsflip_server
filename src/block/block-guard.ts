import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { BlockService } from './block.service';

/**
 * Define a custom decorator to specify which param contains the target user ID
 */
export const TargetUser = (paramName: string) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflector.defineMetadata('targetUserParam', paramName, descriptor.value);
    return descriptor;
  };
};

/**
 * Guard to prevent interactions between users who have blocked each other
 */
@Injectable()
export class BlockGuard implements CanActivate {
  private readonly logger = new Logger(BlockGuard.name);

  constructor(
    private readonly blockService: BlockService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const currentUser = request.user;
      
      if (!currentUser) {
        return true;
      }
      
      // Get target user ID param name from metadata
      const handler = context.getHandler();
      const targetUserParam = this.reflector.get<string>('targetUserParam', handler);
      
      if (!targetUserParam) {
        return true;
      }
      
      // Extract target user ID from the specified param
      const targetUserId = this.extractTargetUserId(request, targetUserParam);
      
      if (!targetUserId || currentUser.id === targetUserId) {
        return true;
      }
      
      // Check if either user has blocked the other
      const hasAnyBlock = await this.blockService.hasAnyBlock(
        currentUser.id,
        targetUserId
      );
      
      if (hasAnyBlock) {
        throw new ForbiddenException('This interaction is not allowed');
      }
      
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Error in block guard: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Extract target user ID from request based on param name
   */
  private extractTargetUserId(request: any, paramName: string): string | null {
    // From route params
    if (request.params && request.params[paramName]) {
      return request.params[paramName];
    }
    
    // From query string
    if (request.query && request.query[paramName]) {
      return request.query[paramName];
    }
    
    // From request body
    if (request.body && request.body[paramName]) {
      return request.body[paramName];
    }
    
    return null;
  }
}
