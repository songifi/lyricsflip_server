import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface Request {
  user?: any;
}

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();

    if (data) {
      return request?.user[data];
    }

    return request?.user;
  },
);

// @GetUser() me: User
