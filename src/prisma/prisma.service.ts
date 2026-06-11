import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(configService: ConfigService) {
    const pool = new pg.Pool({
      connectionString: configService.get<string>('DATABASE_URL'),
    });
    const adapter = new PrismaPg(pool);
    super({ 
      adapter,
      omit: {
        usuario: {
          password: true,
        },
      },
    } as any); // Cast as any if TS definitions aren't fully updated for omit yet
  }

  async onModuleInit() {
    await this.$connect();
  }
}
