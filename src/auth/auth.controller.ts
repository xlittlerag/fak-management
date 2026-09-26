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
import { Public } from './decorators/public.decorator';
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
  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body('password') password: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.adminLogin(password);
    // Sesión únicamente en cookie httpOnly: el JWT nunca sale en el cuerpo.
    setAuthCookie(res, result.access_token);
    return { mensaje: 'Sesión iniciada correctamente.' };
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
  @Post('reset-password/request')
  async requestReset(@Body('dni') dni: string) {
    return this.authService.requestReset(dni);
  }

  @Public()
  @Post('reset-password/complete')
  @HttpCode(HttpStatus.OK)
  async completeReset(
    @Body() body: { dni: string; codigo: string; nueva_password: string },
  ) {
    return this.authService.completeReset(
      body.dni,
      body.codigo,
      body.nueva_password,
    );
  }
}
