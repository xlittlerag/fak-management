import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeeConfigService {
  constructor(private prisma: PrismaService) {}

  async getFeeConfig() {
    return this.prisma.cuotaGlobal.findFirst({
      orderBy: { id: 'desc' },
      select: { monto_actual: true, fecha_vencimiento: true },
    });
  }

  async upsertFeeConfig(monto_actual: number, fecha_vencimiento: string) {
    return this.prisma.cuotaGlobal.create({
      data: {
        monto_actual,
        fecha_vencimiento: new Date(fecha_vencimiento),
      },
      select: { monto_actual: true, fecha_vencimiento: true },
    });
  }
}
