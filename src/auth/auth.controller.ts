import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { VerificarAdmin2faDto } from './dto/verificar-admin-2fa.dto';
import { ConfirmarSetup2faDto } from './dto/confirmar-setup-2fa.dto';
import { Deshabilitar2faDto } from './dto/deshabilitar-2fa.dto';
import { CompleteResetDto } from './dto/complete-reset.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { Rol } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { clearAuthCookie, setAuthCookie } from './auth-cookie';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    // Sesión únicamente en cookie httpOnly: el JWT nunca sale en el cuerpo.
    setAuthCookie(res, result.access_token);
    return { mensaje: 'Sesión iniciada correctamente.' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body('password') password: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.adminLogin(password);
    // Con 2FA habilitado no se crea sesión: se devuelve el token pendiente
    // para el segundo paso. Sin 2FA, comportamiento original con cookie.
    if ('requiere_2fa' in result) {
      return result;
    }
    setAuthCookie(res, result.access_token);
    return { mensaje: 'Sesión iniciada correctamente.' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('admin-2fa/verificar')
  @HttpCode(HttpStatus.OK)
  async verificarAdmin2fa(
    @Body() dto: VerificarAdmin2faDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verificarAdmin2fa(
      dto.token_pendiente,
      dto.codigo,
    );
    // Sesión únicamente en cookie httpOnly: el JWT nunca sale en el cuerpo.
    setAuthCookie(res, result.access_token);
    return { mensaje: 'Sesión iniciada correctamente.' };
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Get('admin-2fa/estado')
  estado2fa(@Req() req: Request) {
    const user = req.user as { id: number };
    return this.authService.estado2fa(user.id);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post('admin-2fa/setup')
  setup2fa(@Req() req: Request) {
    const user = req.user as { id: number };
    return this.authService.iniciarSetup2fa(user.id);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post('admin-2fa/confirmar')
  @HttpCode(HttpStatus.OK)
  confirmar2fa(@Req() req: Request, @Body() dto: ConfirmarSetup2faDto) {
    const user = req.user as { id: number };
    return this.authService.confirmarSetup2fa(user.id, dto.codigo);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post('admin-2fa/deshabilitar')
  @HttpCode(HttpStatus.OK)
  deshabilitar2fa(@Req() req: Request, @Body() dto: Deshabilitar2faDto) {
    const user = req.user as { id: number };
    return this.authService.deshabilitar2fa(user.id, dto.password);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post('admin-2fa/respaldo/regenerar')
  @HttpCode(HttpStatus.OK)
  regenerarRespaldo2fa(@Req() req: Request) {
    const user = req.user as { id: number };
    return this.authService.regenerarRespaldo2fa(user.id);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res);
    return { mensaje: 'Sesión cerrada correctamente.' };
  }

  @Get('session')
  getSession(@Req() req: Request) {
    return req.user;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password/request')
  async requestReset(@Body('dni') dni: string) {
    return this.authService.requestReset(dni);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password/complete')
  @HttpCode(HttpStatus.OK)
  async completeReset(@Body() dto: CompleteResetDto) {
    return this.authService.completeReset(
      dto.dni,
      dto.codigo,
      dto.nueva_password,
    );
  }
}
