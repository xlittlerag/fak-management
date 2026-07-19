import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class SpaFallbackMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    const indexFile = join(process.cwd(), 'frontend', 'dist', 'index.html');
    if (existsSync(indexFile)) {
      res.sendFile(indexFile);
    } else {
      next();
    }
  }
}
