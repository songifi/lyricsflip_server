// src/privacy/decorators/privacy.decorators.ts

import { SetMetadata } from '@nestjs/common';
import { 
  REQUIRES_PROFILE_ACCESS, 
  REQUIRES_CONTENT_ACCESS, 
  REQUIRES_DIRECT_MESSAGE_ACCESS 
} from '../guards/privacy.guard';

/**
 * Decorator to indicate that an endpoint requires access to view a user's profile
 * Will check privacy settings to determine if the requester can view the profile
 */
export const RequiresProfileAccess = () => SetMetadata(REQUIRES_PROFILE_ACCESS, true);

/**
 * Decorator to indicate that an endpoint requires access to view a specific type of content
 * @param contentType The type of content (post or message)
 */
export const RequiresContentAccess = (contentType: 'post' | 'message') => 
  SetMetadata(REQUIRES_CONTENT_ACCESS, contentType);

/**
 * Decorator to indicate that an endpoint requires access to send direct messages
 */
export const RequiresDirectMessageAccess = () => 
  SetMetadata(REQUIRES_DIRECT_MESSAGE_ACCESS, true);
