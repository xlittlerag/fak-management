import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from 'crypto';

// TOTP (RFC 6238, SHA-1, 6 dígitos, paso 30s) implementado sobre node:crypto:
// se evita la dependencia ESM de otplib, incompatible con el runner jest.
// El secreto TOTP se guarda cifrado (AES-256-GCM), nunca en texto plano.
// La clave de cifrado sale de TOTP_ENCRYPTION_KEY; sin ella el servicio
// falla de forma explícita en lugar de guardar secretos sin cifrar.
export const TOTP_ISSUER = 'KendoManager';
export const TOTP_LABEL = 'admin@kendo-manager';
export const TOTP_PERIOD = 30;
export const TOTP_DIGITS = 6;
// Ventana de un paso hacia atrás/adelante por desvío de relojes.
const WINDOW = 1;
export const BACKUP_CODES_COUNT = 10;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let valor = 0;
  let salida = '';
  for (const byte of bytes) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      salida += BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    salida += BASE32[(valor << (5 - bits)) & 31];
  }
  return salida;
}

function base32Decode(texto: string): Buffer {
  const limpio = texto.trim().replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];
  for (const char of limpio) {
    const indice = BASE32.indexOf(char);
    if (indice === -1) throw new Error('Secreto TOTP inválido.');
    valor = (valor << 5) | indice;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secreto: Buffer, contador: number): string {
  const mensaje = Buffer.alloc(8);
  mensaje.writeBigUInt64BE(BigInt(contador));
  const hmac = createHmac('sha1', secreto).update(mensaje).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codigo =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(codigo % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

function contadorActual(): number {
  return Math.floor(Date.now() / 1000 / TOTP_PERIOD);
}

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly encryptionKey: Buffer | null;

  constructor(configService: ConfigService) {
    const raw = configService.get<string>('TOTP_ENCRYPTION_KEY');
    if (!raw) {
      this.logger.warn(
        'TOTP_ENCRYPTION_KEY no configurada: el 2FA del admin general queda deshabilitado.',
      );
      this.encryptionKey = null;
    } else {
      // Acepta hex de 64 chars o cualquier string (derivado con scrypt).
      this.encryptionKey = /^[0-9a-fA-F]{64}$/.test(raw.trim())
        ? Buffer.from(raw.trim(), 'hex')
        : scryptSync(raw, 'kendo-manager-totp', 32);
    }
  }

  get disponible(): boolean {
    return this.encryptionKey !== null;
  }

  private exigirClave(): Buffer {
    if (!this.encryptionKey) {
      throw new Error(
        'El segundo factor no está configurado en el servidor (falta TOTP_ENCRYPTION_KEY).',
      );
    }
    return this.encryptionKey;
  }

  generarSecreto(): { secreto: string; otpauthUrl: string } {
    this.exigirClave();
    const secreto = base32Encode(randomBytes(20));
    const etiqueta = encodeURIComponent(`${TOTP_ISSUER}:${TOTP_LABEL}`);
    const otpauthUrl =
      `otpauth://totp/${etiqueta}` +
      `?secret=${secreto}&issuer=${encodeURIComponent(TOTP_ISSUER)}` +
      `&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
    return { secreto, otpauthUrl };
  }

  async generarQR(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  verificar(secretoPlano: string, codigo: string): boolean {
    let secreto: Buffer;
    try {
      secreto = base32Decode(secretoPlano);
    } catch {
      return false;
    }
    const limpio = codigo.trim();
    if (!/^\d{6}$/.test(limpio)) return false;
    const actual = contadorActual();
    const esperado = Buffer.from(limpio, 'utf8');
    for (let delta = -WINDOW; delta <= WINDOW; delta++) {
      const candidato = Buffer.from(hotp(secreto, actual + delta), 'utf8');
      if (
        candidato.length === esperado.length &&
        timingSafeEqual(candidato, esperado)
      ) {
        return true;
      }
    }
    return false;
  }

  /** Genera un token TOTP válido para el secreto dado (útil en tests). */
  generarCodigo(secretoPlano: string): string {
    return hotp(base32Decode(secretoPlano), contadorActual());
  }

  cifrar(secretoPlano: string): string {
    const key = this.exigirClave();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const cifrado = Buffer.concat([
      cipher.update(secretoPlano, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${cifrado.toString('hex')}`;
  }

  descifrar(secretoCifrado: string): string {
    const key = this.exigirClave();
    const [ivHex, tagHex, dataHex] = secretoCifrado.split(':');
    if (!ivHex || !tagHex || !dataHex) {
      throw new Error('Formato de secreto 2FA inválido.');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return (
      decipher.update(Buffer.from(dataHex, 'hex')).toString('utf8') +
      decipher.final('utf8')
    );
  }

  /** Códigos de respaldo de 8 dígitos (numéricos, fáciles de tipear). */
  generarCodigosRespaldoPlano(cantidad: number = BACKUP_CODES_COUNT): string[] {
    const codigos: string[] = [];
    for (let i = 0; i < cantidad; i++) {
      codigos.push(String(randomInt(0, 100_000_000)).padStart(8, '0'));
    }
    return codigos;
  }
}
