import { Controller, Get, Patch, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';
import { FeeConfigService } from './fee-config.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminFeeController {
  constructor(private readonly feeConfigService: FeeConfigService) {}

  @Patch('fee')
  @Roles(Rol.ADMIN_GENERAL)
  async setFeeConfig(
    @Body()
    body: {
      monto_actual: number;
      fecha_vencimiento: string;
    },
  ) {
    const { monto_actual, fecha_vencimiento } = body;

    if (!fecha_vencimiento) {
      throw new BadRequestException('La fecha de vencimiento es obligatoria');
    }

    return this.feeConfigService.upsertFeeConfig(monto_actual, fecha_vencimiento);
  }

  @Get('fee')
  @Roles(Rol.ADMIN_GENERAL)
  async getFeeConfig() {
    return this.feeConfigService.getFeeConfig();
  }
}
