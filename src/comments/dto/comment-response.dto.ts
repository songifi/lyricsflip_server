// File: src/modules/comments/dto/comment-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { CommentStatus, ContentType } from '../schemas/comment.schema';

export class UserDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  id: string;
  
  @ApiProperty({ example: 'John Doe' })
  name: string;
  
  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  avatar?: string;
}

export class CommentResponseDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c86' })
  id: string;
  
  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  userId: string;
  
  @ApiProperty({ type: UserDto })
  user: UserDto;
  
  @ApiProperty({ enum: ContentType, example: ContentType.SONG })
  contentType: ContentType;
  
  @ApiProperty({ example: '60d21b4667d0d8992e610c87' })
  contentId: string;
  
  @ApiProperty({ example: '60d21b4667d0d8992e610c88', required: false })
  parentId?: string;
  
  @ApiProperty({ example: 'This is a great song!' })
  text: string;
  
  @ApiProperty({ enum: CommentStatus, example: CommentStatus.ACTIVE })
  status: CommentStatus;
  
  @ApiProperty({ example: 5 })
  likesCount: number;
  
  @ApiProperty({ example: 2 })
  repliesCount: number;
  
  @ApiProperty({ example: 0 })
  depth: number;
  
  @ApiProperty({ example: false })
  isEdited: boolean;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z' })
  createdAt: Date;
  
  @ApiProperty({ example: '2023-04-01T12:00:00.000Z' })
  updatedAt: Date;
  
  @ApiProperty({ type: [CommentResponseDto], required: false })
  replies?: CommentResponseDto[];
}
