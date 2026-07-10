import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  usuario_id: number;
  ip: string;
  user_agent: string;
}

@Injectable()
export class RequestContextService {
  private als = new AsyncLocalStorage<RequestContext>();

  run(context: RequestContext, fn: () => void) {
    this.als.run(context, fn);
  }

  get(): RequestContext | undefined {
    return this.als.getStore();
  }
}
