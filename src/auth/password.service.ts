import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { ARGON2_OPTIONS } from './argon2-options';

/**
 * Único punto de hashing de secretos (passwords y códigos de blanqueo).
 * Argon2id con parámetros base OWASP: m=19 MiB, t=2, p=1.
 */
@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    return hash(plain, { ...ARGON2_OPTIONS });
  }

  async verify(storedHash: string, plain: string): Promise<boolean> {
    return verify(storedHash, plain);
  }
}
