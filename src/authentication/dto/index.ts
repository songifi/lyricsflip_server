import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDTO {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'P@ssw0rd!',
    description: 'User password',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}
export class RefreshTokenDTO {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2N2Q1M2RhMGVkOWFiNTRlOTlmMmY0NWIiLCJlbWFpbCI6ImFyb3dvc2VnYmU2N0BnbWFpbC5jb20iLCJyb2xlcyI6WyJ1c2VyIiwibW9kZXJhdG9yIl0sImlhdCI6MTc0MjAzMDM4MywiZXhwIjoxNzQyMDMzOTgzfQ.xM94UAWlzrVf_22U3cYPb-bonhS27CSLVPdTgSQI8AU',
    description: 'Refresh Token',
  })
  @IsNotEmpty()
  refreshToken: string;
}
