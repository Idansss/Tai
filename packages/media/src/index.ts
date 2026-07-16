import { createHash } from 'node:crypto';

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

export const MEDIA_QUEUE_NAME = 'media-derivatives';
export const MEDIA_DERIVATIVE_JOB = 'create-derivatives';
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
export const MAX_MEDIA_DIMENSION = 20_000;
export const MIN_MEDIA_DIMENSION = 512;
export const LOW_RESOLUTION_DIMENSION = 3_000;

export interface MediaDerivativeJobData {
  originalAssetId: string;
  processingJobId: string;
}

export interface StoredObject {
  key: string;
  body: Uint8Array;
  contentType: string;
  checksumSha256: string;
}

export interface ObjectStorage {
  put(object: StoredObject): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  signedGetUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export type MalwareScanResult =
  | { status: 'CLEAN' }
  | { status: 'INFECTED'; signature?: string }
  | { status: 'ERROR'; reason: string };

export interface MalwareScanner {
  scan(bytes: Uint8Array): Promise<MalwareScanResult>;
}

export class MediaValidationError extends Error {
  constructor(
    readonly publicCode:
      | 'FILE_TOO_LARGE'
      | 'UNSUPPORTED_FILE_TYPE'
      | 'FILE_TYPE_MISMATCH'
      | 'INVALID_IMAGE'
      | 'INVALID_DIMENSIONS',
    message: string,
  ) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

const supported = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
} as const;

export interface ValidatedImage {
  bytes: Uint8Array;
  mimeType: (typeof supported)[keyof typeof supported];
  extension: keyof typeof supported;
  width: number;
  height: number;
  hasAlpha: boolean;
  dominantHex: string | null;
  checksumSha256: string;
  lowResolution: boolean;
}

export async function validateImage(input: {
  bytes: Uint8Array;
  declaredMimeType: string;
  filename: string;
}): Promise<ValidatedImage> {
  if (input.bytes.byteLength > MAX_MEDIA_BYTES) {
    throw new MediaValidationError('FILE_TOO_LARGE', 'Image exceeds the 25 MB limit.');
  }
  const detected = await fileTypeFromBuffer(input.bytes);
  const extension =
    input.filename.split('.').at(-1)?.toLowerCase() === 'jpeg'
      ? 'jpg'
      : input.filename.split('.').at(-1)?.toLowerCase();
  if (!detected || !(detected.ext in supported)) {
    throw new MediaValidationError(
      'UNSUPPORTED_FILE_TYPE',
      'Only PNG, JPEG, and WebP images are accepted.',
    );
  }
  const detectedExtension = detected.ext === 'jpeg' ? 'jpg' : detected.ext;
  const expectedMime = supported[detectedExtension as keyof typeof supported];
  if (extension !== detectedExtension || input.declaredMimeType.toLowerCase() !== expectedMime) {
    throw new MediaValidationError(
      'FILE_TYPE_MISMATCH',
      'Filename, declared MIME type, and file signature must agree.',
    );
  }
  let metadata: sharp.Metadata;
  let dominant: { r: number; g: number; b: number } | undefined;
  try {
    const image = sharp(input.bytes, {
      failOn: 'error',
      limitInputPixels: MAX_MEDIA_DIMENSION * MAX_MEDIA_DIMENSION,
    });
    metadata = await image.metadata();
    dominant = await image
      .clone()
      .resize({ width: 32, height: 32, fit: 'inside', withoutEnlargement: true })
      .stats()
      .then((value) => value.dominant);
  } catch {
    throw new MediaValidationError('INVALID_IMAGE', 'The image could not be decoded safely.');
  }
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (
    width < MIN_MEDIA_DIMENSION ||
    height < MIN_MEDIA_DIMENSION ||
    width > MAX_MEDIA_DIMENSION ||
    height > MAX_MEDIA_DIMENSION
  ) {
    throw new MediaValidationError(
      'INVALID_DIMENSIONS',
      `Image dimensions must be between ${MIN_MEDIA_DIMENSION} and ${MAX_MEDIA_DIMENSION} pixels.`,
    );
  }
  return {
    bytes: input.bytes,
    mimeType: expectedMime,
    extension: detectedExtension as keyof typeof supported,
    width,
    height,
    hasAlpha: metadata.hasAlpha ?? false,
    dominantHex: dominant
      ? `#${[dominant.r, dominant.g, dominant.b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
      : null,
    checksumSha256: createHash('sha256').update(input.bytes).digest('hex'),
    lowResolution: width < LOW_RESOLUTION_DIMENSION || height < LOW_RESOLUTION_DIMENSION,
  };
}

export async function createWebDerivatives(bytes: Uint8Array): Promise<{
  web: Uint8Array;
  thumbnail: Uint8Array;
}> {
  const base = sharp(bytes, {
    failOn: 'error',
    limitInputPixels: MAX_MEDIA_DIMENSION ** 2,
  }).rotate();
  const [web, thumbnail] = await Promise.all([
    base
      .clone()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer(),
    base
      .clone()
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer(),
  ]);
  return { web, thumbnail };
}

export class EicarAwareMalwareScanner implements MalwareScanner {
  async scan(bytes: Uint8Array): Promise<MalwareScanResult> {
    const content = Buffer.from(bytes).toString('latin1');
    return content.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')
      ? { status: 'INFECTED', signature: 'EICAR-Test-File' }
      : { status: 'CLEAN' };
  }
}

export class HttpMalwareScanner implements MalwareScanner {
  constructor(private readonly endpoint: string) {}

  async scan(bytes: Uint8Array): Promise<MalwareScanResult> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: Buffer.from(bytes),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) return { status: 'ERROR', reason: `scanner returned ${response.status}` };
      const payload = (await response.json()) as { status?: string; signature?: string };
      if (payload.status === 'CLEAN') return { status: 'CLEAN' };
      if (payload.status === 'INFECTED')
        return { status: 'INFECTED', signature: payload.signature };
      return { status: 'ERROR', reason: 'scanner returned an invalid result' };
    } catch {
      return { status: 'ERROR', reason: 'scanner request failed' };
    }
  }
}

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    config: S3ClientConfig,
  ) {
    this.client = new S3Client(config);
  }

  async put(object: StoredObject): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: object.key,
        Body: object.body,
        ContentType: object.contentType,
        ChecksumSHA256: Buffer.from(object.checksumSha256, 'hex').toString('base64'),
      }),
    );
  }

  async get(key: string): Promise<Uint8Array> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) throw new Error('Stored object has no body.');
    return response.Body.transformToByteArray();
  }

  signedGetUrl(key: string, expiresInSeconds = 900): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }
}
