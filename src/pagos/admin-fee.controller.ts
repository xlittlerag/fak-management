import { Controller, Get, Patch, Body } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';
import { FeeConfigService } from './fee-config.service';
import { SetFeeDto } from './dto/fee.dto';

@Controller('admin')
export class AdminFeeController {
  constructor(private readonly feeConfigService: FeeConfigService) {}

  @Patch('fee')
  @Roles(Rol.ADMIN_GENERAL)
  async setFeeConfig(@Body() dto: SetFeeDto) {
    return this.feeConfigService.upsertFeeConfig(dto.monto_actual, dto.fecha_vencimiento);
  }

  @Get('fee')
  @Roles(Rol.ADMIN_GENERAL)
  async getFeeConfig() {
    return this.feeConfigService.getFeeConfig();
  }
}
