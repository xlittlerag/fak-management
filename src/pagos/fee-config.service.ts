import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeeConfigService {
  constructor(private prisma: PrismaService) {}

  async getFeeConfig() {
    const feeConfig = await this.prisma.$queryRaw<Array<{ monto_actual: number; fecha_vencimiento: Date }>>`
      SELECT monto_actual, fecha_vencimiento FROM cuotaglobal ORDER BY id DESC LIMIT 1
    `;

    if (feeConfig && feeConfig.length > 0) {
      return {
        monto_actual: feeConfig[0].monto_actual,
        fecha_vencimiento: feeConfig[0].fecha_vencimiento,
      };
    }

    return null;
  }

  async upsertFeeConfig(monto_actual: number, fecha_vencimiento: string) {
    const feeConfig = await this.prisma.$queryRaw<Array<{ monto_actual: number; fecha_vencimiento: Date }>>`
      INSERT INTO cuotaglobal (monto_actual, fecha_vencimiento)
      VALUES (${monto_actual}, ${new Date(fecha_vencimiento)})
      ON CONFLICT (id) DO UPDATE SET
        monto_actual = EXCLUDED.monto_actual,
        fecha_vencimiento = EXCLUDED.fecha_vencimiento
      RETURNING monto_actual, fecha_vencimiento
    `;

    return {
      monto_actual: feeConfig[0].monto_actual,
      fecha_vencimiento: feeConfig[0].fecha_vencimiento,
    };
  }
}
