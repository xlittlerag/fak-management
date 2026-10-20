import { readFileSync } from 'fs';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { Transporter } from 'nodemailer';
import { NotificacionesModule } from '../src/notificaciones/notificaciones.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), NotificacionesModule],
})
class TestMailModule {}

function render(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) =>
      acc.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value),
    template,
  );
}

async function main(): Promise<void> {
  const to = (process.env.TEST_EMAIL || process.env.SMTP_USER || '').trim();
  if (!to) {
    throw new Error(
      'Falta TEST_EMAIL o SMTP_USER (destinatario) en el entorno.',
    );
  }

  const app = await NestFactory.createApplicationContext(TestMailModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const transporter = app.get<Transporter | null>('MAIL_TRANSPORT');
    if (!transporter) {
      throw new Error('SMTP no configurado: falta SMTP_HOST en .env.');
    }

    console.log('Verificando conexión SMTP...');
    await transporter.verify();
    console.log('Conexión SMTP OK.');

    const templatePath = join(
      __dirname,
      '../src/notificaciones/templates/welcome.html',
    );
    const html = render(readFileSync(templatePath, 'utf-8'), {
      nombre: 'Prueba',
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: 'Prueba de envío - Kendo Argentina',
      html,
    });

    console.log(`Email enviado a ${to}. messageId=${info.messageId}`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(
    'Fallo el test de email:',
    err instanceof Error ? err.message : err,
  );
  process.exitCode = 1;
});
