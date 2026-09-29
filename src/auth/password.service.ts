import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/**
 * Único punto de hashing de secretos (passwords y códigos de blanqueo).
 * Argon2id con parámetros base OWASP: m=19 MiB, t=2, p=1.
 */
export const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    return hash(plain, { ...ARGON2_OPTIONS });
  }

  async verify(storedHash: string, plain: string): Promise<boolean> {
    return verify(storedHash, plain);
  }
}
