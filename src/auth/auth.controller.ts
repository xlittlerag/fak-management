import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  adminLogin(@Body('password') password: string) {
    return this.authService.adminLogin(password);
  }

  @Public()
  @Post('reset-password/request')
  async requestReset(@Body('dni') dni: string) {
    return this.authService.requestReset(dni);
  }
}
