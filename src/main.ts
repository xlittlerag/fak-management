import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { corsOrigins } from './utils/cors-origins';
import { validationMessages } from './utils/validation-messages';
import { GlobalExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((e) =>
          Object.values(e.constraints || {}).map(
            (c) => validationMessages[c] || c,
          ),
        );
        return new BadRequestException(messages);
      },
    }),
  );
  app.use(cookieParser());
  // Compresión gzip de respuestas (JSON de la API y assets del frontend).
  app.use(compression());
  // Cabeceras de seguridad. Sin CORP (el frontend dev corre en otro origen)
  // y con CSP que permite el SDK de Mercado Pago; los uploads se sirven
  // como adjunto así que no necesitan ejecutarse en el origen.
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://sdk.mercadopago.com'],
          connectSrc: ["'self'", 'https://api.mercadopago.com'],
          frameSrc: ["'self'", 'https://www.mercadopago.com'],
          imgSrc: ["'self'", 'data:', 'https://*.mlstatic.com'],
          styleSrc: ["'self'"],
        },
      },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  // credentials: true para que el navegador envíe la cookie httpOnly de
  // sesión, pero solo hacia orígenes explícitos (ver corsOrigins).
  app.enableCors({ origin: corsOrigins(), credentials: true });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
