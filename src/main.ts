import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { validationMessages } from './utils/validation-messages';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) => {
      const constraint = Object.values(errors[0].constraints || {})[0];
      const message = validationMessages[constraint] || constraint;
      return new BadRequestException(message);
    }
  }));
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
