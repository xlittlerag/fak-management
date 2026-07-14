import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Transporter } from 'nodemailer';

const TEMPLATES_DIR = join(__dirname, 'templates');

function loadTemplate(name: string): string {
  const path = join(TEMPLATES_DIR, `${name}.html`);
  if (!existsSync(path)) return '';
  return readFileSync(path, 'utf-8');
}

function render(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);
  private templates: Record<string, string> = {};

  constructor(
    @Inject('MAIL_TRANSPORT') private transporter: Transporter | null,
    private config: ConfigService,
  ) {}

  private getTemplate(name: string): string {
    if (!this.templates[name]) {
      this.templates[name] = loadTemplate(name);
    }
    return this.templates[name];
  }

  private async send(options: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('SMTP no configurado — email no enviado a %s (asunto: %s)', options.to, options.subject);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM'),
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log('Email enviado a %s (asunto: %s)', options.to, options.subject);
    } catch (err) {
      this.logger.warn(err, 'Error al enviar email a %s (asunto: %s)', options.to, options.subject);
    }
  }

  async sendWelcomeEmail(to: string, nombre: string): Promise<void> {
    const html = render(this.getTemplate('welcome'), { nombre });
    await this.send({ to, subject: 'Bienvenido a la FAK', html });
  }

  async sendPasswordResetEmail(to: string, nombre: string, codigo: string): Promise<void> {
    const html = render(this.getTemplate('password-reset'), { nombre, codigo });
    await this.send({ to, subject: 'Restablecimiento de Contraseña - FAK', html });
  }

  async sendInscripcionStatusEmail(to: string, nombre: string, evento: string, estado: string): Promise<void> {
    const estadoLabel = estado === 'APROBADO' ? 'aprobada' : 'rechazada';
    const mensajeAdicional = estado === 'APROBADO'
      ? '<p>Puede proceder al pago desde el panel de eventos para confirmar su participación.</p>'
      : '<p>Si considera que esto es un error, contacte al administrador de su asociación.</p>';
    const html = render(this.getTemplate('inscripcion-status'), {
      nombre, evento, estado: estadoLabel, mensaje_adicional: mensajeAdicional,
    });
    await this.send({ to, subject: `Inscripción ${estadoLabel} - FAK`, html });
  }

  async sendCertificacionStatusEmail(to: string, nombre: string, disciplina: string, estado: string): Promise<void> {
    const estadoLabel: Record<string, string> = {
      APROBADO: 'aprobada',
      APROBADO_ASOCIACION: 'aprobada por la asociación',
      RECHAZADO: 'rechazada',
      PENDIENTE: 'pendiente',
    };
    const html = render(this.getTemplate('certificacion-status'), {
      nombre, disciplina, estado: estadoLabel[estado] || estado,
    });
    await this.send({ to, subject: `Certificación ${estadoLabel[estado] || estado} - FAK`, html });
  }
}
