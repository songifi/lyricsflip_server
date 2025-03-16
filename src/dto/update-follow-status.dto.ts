import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { FollowStatus } from '../schemas/follow.schema';

export class UpdateFollowStatusDto {
  @ApiProperty({
    description: 'Status of the follow relationship',
    enum: FollowStatus,
    example: FollowStatus.ACTIVE,
  })
  @IsNotEmpty()
  @IsEnum(FollowStatus)
  status: FollowStatus;
}