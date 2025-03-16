// src/modules/follow/dto/create-follow.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { FollowStatus } from '../schemas/follow.schema';

export class CreateFollowDto {
  @ApiProperty({
    description: 'ID of the user to follow',
    example: '6073a21c5748e830fc4316b6',
  })
  @IsNotEmpty()
  @IsMongoId()
  followeeId: string;
}

