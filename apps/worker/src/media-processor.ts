import { createHash } from 'node:crypto';

import sharp from 'sharp';
import { createWebDerivatives, type ObjectStorage } from '@tms/media';

export interface OriginalForProcessing {
  id: string;
  artworkVersionId: string;
  storageKey: string;
  originalFilename: string;
  createdByUserId: string;
}

export interface DerivativeOutput {
  kind: 'WEB_DERIVATIVE' | 'THUMBNAIL';
  variantKey: 'web-1600' | 'thumbnail-400';
  storageKey: string;
  bytes: Uint8Array;
  width: number;
  height: number;
  checksumSha256: string;
}

export interface MediaProcessingRepository {
  start(originalAssetId: string, processingJobId: string): Promise<OriginalForProcessing>;
  succeed(
    original: OriginalForProcessing,
    processingJobId: string,
    outputs: DerivativeOutput[],
  ): Promise<void>;
  fail(
    originalAssetId: string,
    processingJobId: string,
    code: string,
    message: string,
  ): Promise<void>;
}

export class MediaDerivativeProcessor {
  constructor(
    private readonly repository: MediaProcessingRepository,
    private readonly storage: ObjectStorage,
  ) {}

  async process(data: { originalAssetId: string; processingJobId: string }): Promise<void> {
    let original: OriginalForProcessing | undefined;
    try {
      original = await this.repository.start(data.originalAssetId, data.processingJobId);
      const bytes = await this.storage.get(original.storageKey);
      const derivatives = await createWebDerivatives(bytes);
      const outputs = await Promise.all([
        this.output(original, 'WEB_DERIVATIVE', 'web-1600', derivatives.web),
        this.output(original, 'THUMBNAIL', 'thumbnail-400', derivatives.thumbnail),
      ]);
      await Promise.all(
        outputs.map((output) =>
          this.storage.put({
            key: output.storageKey,
            body: output.bytes,
            contentType: 'image/webp',
            checksumSha256: output.checksumSha256,
          }),
        ),
      );
      await this.repository.succeed(original, data.processingJobId, outputs);
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 500) : 'Unknown media processing failure.';
      await this.repository.fail(
        data.originalAssetId,
        data.processingJobId,
        'DERIVATIVE_PROCESSING_FAILED',
        message,
      );
      throw error;
    }
  }

  private async output(
    original: OriginalForProcessing,
    kind: DerivativeOutput['kind'],
    variantKey: DerivativeOutput['variantKey'],
    bytes: Uint8Array,
  ): Promise<DerivativeOutput> {
    const metadata = await sharp(bytes).metadata();
    const checksumSha256 = createHash('sha256').update(bytes).digest('hex');
    return {
      kind,
      variantKey,
      storageKey: `artworks/versions/${original.artworkVersionId}/derivatives/${variantKey}-${checksumSha256}.webp`,
      bytes,
      width: metadata.width!,
      height: metadata.height!,
      checksumSha256,
    };
  }
}
