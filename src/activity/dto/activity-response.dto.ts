import { ApiProperty } from '@nestjs/swagger';
import { ActivityType, ContentType } from '../schemas/activity.schema';

export class UserDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  id: string;
  
  @ApiProperty({ example: 'John Doe' })
  name: string;
  
  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatar?: string;
}

export class ContentDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c86' })
  id: string;
  
  @ApiProperty({ enum: ContentType, example: ContentType.POST })
  type: ContentType;
  
  @ApiProperty({ example: 'My first blog post' })
  title?: string;
  
  @ApiProperty({ example: 'This is the content preview...' })
  preview?: string;
}

export class ActivityResponseDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c87' })
  id: string;
  
  @ApiProperty({ type: UserDto })
  user: UserDto;
  
  @ApiProperty({ enum: ActivityType, example: ActivityType.LIKE })
  activityType: ActivityType;
  
  @ApiProperty({ type: ContentDto })
  content: ContentDto;
  
  @ApiProperty({
    example: {
      text: 'Great post!',
      postTitle: 'My first blog post'
    }
  })
  metadata: Record<string, any>;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z' })
  createdAt: Date;
}
