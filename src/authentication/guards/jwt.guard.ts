import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticationService } from '../authentication.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly authService: AuthenticationService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // First, call the default AuthGuard logic to validate JWT
    const isValid = await super.canActivate(context);
    if (!isValid) return false;

    // Extract the token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('No token provided');

    const token = authHeader.split(' ')[1];

    // 🔹 Check if the token is blacklisted
    if (await this.authService.isTokenBlacklisted(token)) {
      throw new UnauthorizedException('Token is invalid (blacklisted)');
    }

    return true;
  }
}
