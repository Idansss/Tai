import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { createWebDerivatives, EicarAwareMalwareScanner, validateImage } from './index.js';
import type { MediaValidationError } from './index.js';

async function image(width = 800, height = 700): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 4, background: '#ff00aa80' } })
    .png()
    .toBuffer();
}

describe('media validation and transformations', () => {
  it('detects real image type and records metadata without changing the original', async () => {
    const bytes = await image();
    const result = await validateImage({
      bytes,
      declaredMimeType: 'image/png',
      filename: 'art.png',
    });
    expect(result).toMatchObject({
      extension: 'png',
      width: 800,
      height: 700,
      hasAlpha: true,
      lowResolution: true,
    });
    expect(result.checksumSha256).toHaveLength(64);
    expect(bytes.equals(Buffer.from(result.bytes))).toBe(true);
  }, 15_000);

  it('rejects MIME and extension spoofing', async () => {
    await expect(
      validateImage({ bytes: await image(), declaredMimeType: 'image/jpeg', filename: 'art.jpg' }),
    ).rejects.toMatchObject({
      publicCode: 'FILE_TYPE_MISMATCH',
    } satisfies Partial<MediaValidationError>);
  });

  it('rejects unsafe dimensions and creates bounded web derivatives', async () => {
    await expect(
      validateImage({
        bytes: await image(128, 128),
        declaredMimeType: 'image/png',
        filename: 'tiny.png',
      }),
    ).rejects.toMatchObject({
      publicCode: 'INVALID_DIMENSIONS',
    } satisfies Partial<MediaValidationError>);
    const derivatives = await createWebDerivatives(await image());
    await expect(sharp(derivatives.web).metadata()).resolves.toMatchObject({
      format: 'webp',
      width: 800,
    });
    await expect(sharp(derivatives.thumbnail).metadata()).resolves.toMatchObject({
      format: 'webp',
      width: 400,
    });
  }, 15_000);

  it('exposes a deterministic malware hook for test and local development', async () => {
    const scanner = new EicarAwareMalwareScanner();
    await expect(
      scanner.scan(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')),
    ).resolves.toMatchObject({ status: 'INFECTED' });
  });
});
