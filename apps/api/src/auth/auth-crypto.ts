import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const scryptKeyLength = 64;
const scryptCost = 32_768;
const scryptBlockSize = 8;
const scryptParallelization = 1;
const scryptMaxMemory = 64 * 1024 * 1024;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOpaqueValue(value: string, pepper: string): string {
  return createHmac('sha256', pepper).update(value).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await derivePassword(password, salt);

  return [
    'scrypt',
    `N=${scryptCost},r=${scryptBlockSize},p=${scryptParallelization}`,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, parameters, saltValue, hashValue] = encodedHash.split('$');
  if (
    algorithm !== 'scrypt' ||
    parameters !== `N=${scryptCost},r=${scryptBlockSize},p=${scryptParallelization}` ||
    !saltValue ||
    !hashValue
  ) {
    return false;
  }

  const expected = Buffer.from(hashValue, 'base64url');
  if (expected.length !== scryptKeyLength) return false;

  const actual = await derivePassword(password, Buffer.from(saltValue, 'base64url'));

  return timingSafeEqual(actual, expected);
}

function derivePassword(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      scryptKeyLength,
      {
        N: scryptCost,
        r: scryptBlockSize,
        p: scryptParallelization,
        maxmem: scryptMaxMemory,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}
