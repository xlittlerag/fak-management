import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { RequestContextService } from '../auditoria/request-context.service';

const MODEL_NAMES = [
  'adminGeneral', 'asociacion', 'dojo', 'usuario', 'certificadoExterno',
  'evento', 'torneo', 'examen', 'seminario', 'inscripcionEvento',
  'historialGraduacion', 'precioExamen', 'dniBlacklist', 'cuotaGlobal',
  'diplomaNacional', 'reimpresionDiploma', 'configSistema', 'auditLog',
] as const;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private ctxService: RequestContextService | null = null;

  constructor() {
    const adapter = new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL || 'file:./dev.db',
    });

    super({
      adapter,
      omit: {
        usuario: {
          password: true,
        },
      },
    });
  }

  setContextService(ctx: RequestContextService) {
    this.ctxService = ctx;
  }

  async onModuleInit() {
    await this.$connect();
    this.applyExtension();
  }

  async onModuleDestroy() {
  }

  private applyExtension() {
    const prisma = this;
    const ctxService = this.ctxService;
    if (!ctxService) return;

    const logger = this.logger;

    const extended = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (model === 'AuditLog' || !['create', 'update', 'delete', 'upsert'].includes(operation)) {
              return query(args);
            }

            const context = ctxService.get();

            let previousState: unknown = null;
            if (operation === 'update' || operation === 'delete') {
              const where = (args as { where?: Record<string, unknown> })?.where;
              if (where) {
                const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
                try {
                  previousState = await (prisma as unknown as Record<string, { findUnique: (opts: { where: Record<string, unknown> }) => Promise<unknown> }>)[modelKey].findUnique({ where });
                } catch (err) {
                  logger.warn(`Pre-read error for ${model} ${operation}: ${err instanceof Error ? err.message : String(err)}`);
                }
              }
            }

            const result = await query(args);

            try {
              const entityId = (result as { id?: number })?.id ?? 0;
              const auditData: Record<string, unknown> = {
                accion: operation.toUpperCase(),
                entidad: model,
                entidad_id: entityId,
                usuario_id: context?.usuario_id ?? null,
                ip: context?.ip ?? null,
                user_agent: context?.user_agent ?? null,
                datos_previos: operation === 'create' ? null : previousState,
                datos_nuevos: operation === 'delete' ? null : result,
              };
              await (prisma.auditLog.create as unknown as (args: { data: Record<string, unknown> }) => Promise<unknown>)({ data: auditData });
            } catch (err) {
              logger.error(`Audit write failed for ${model} ${operation}: ${err instanceof Error ? err.message : String(err)}`);
            }

            return result;
          },
        },
      },
    });

    const ext = extended as unknown as Record<string, unknown>;

    for (const name of MODEL_NAMES) {
      ext[name];
      Object.defineProperty(this, name, {
        get: () => ext[name],
        configurable: true,
        enumerable: true,
      });
    }

    for (const method of ['$connect', '$disconnect', '$on', '$transaction', '$extends', '$queryRaw', '$executeRaw'] as const) {
      const fn = ext[method] as (...args: unknown[]) => unknown;
      if (typeof fn === 'function') {
        (this as unknown as Record<string, unknown>)[method] = fn.bind(extended);
      }
    }
  }
}
