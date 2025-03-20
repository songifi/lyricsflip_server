// src/modules/auth/guards/ws-jwt-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class WsJwtAuthGuard extends AuthGuard('ws-jwt') implements CanActivate {
  canActivate(context: ExecutionContext) {
    // Add your custom WebSocket authentication logic here
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw new WsException('Unauthorized access');
    }
    return user;
  }
}

// src/modules/auth/strategies/ws-jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { WsException } from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtStrategy extends PassportStrategy(Strategy, 'ws-jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // This will be called after the token is verified
  async validate(payload: any) {
    // You can add additional validation here
    return { sub: payload.sub, username: payload.username };
  }

  // Custom method to extract JWT from socket handshake
  getTokenFromSocket(client: Socket): string | null {
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (!token) {
      throw new WsException('Missing auth token');
    }
    
    // Remove Bearer prefix if present
    return token.replace('Bearer ', '');
  }
}

// src/modules/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    let request;
    
    if (ctx.getType() === 'ws') {
      // WebSocket request
      const client = ctx.switchToWs().getClient();
      return data ? client.user?.[data] : client.user;
    } else {
      // HTTP request
      request = ctx.switchToHttp().getRequest();
      return data ? request.user?.[data] : request.user;
    }
  },
);
