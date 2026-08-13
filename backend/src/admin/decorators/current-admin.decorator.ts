import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface RequestAdmin {
  adminId: string;
  email: string;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestAdmin => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: RequestAdmin }>();
    return request.user;
  },
);
