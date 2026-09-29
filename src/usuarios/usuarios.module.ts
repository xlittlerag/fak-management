import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PagosModule } from '../pagos/pagos.module';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';

@Module({
  imports: [AuthModule, PagosModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
