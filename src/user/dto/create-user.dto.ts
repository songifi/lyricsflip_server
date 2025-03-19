// DTOs for input validation
import { IsEmail, IsNotEmpty, MinLength, Matches, IsEnum } from 'class-validator';
import { UserRole, AccountStatus } from '../../schemas/user.schema';

export class CreateUserDto {
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Password too weak',
  })
  password: string;

  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @IsEnum(AccountStatus)
  accountStatus?: AccountStatus;
}

export class UpdateUserDto {
  username?: string;
  email?: string;
  password?: string;
  roles?: UserRole[];
  accountStatus?: AccountStatus;
}
