import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/schemas/user.schema';

// Define the Roles decorator
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
