export const MEDIA_STORAGE = Symbol('MEDIA_STORAGE');
export const MEDIA_SCANNER = Symbol('MEDIA_SCANNER');
export const MEDIA_QUEUE = Symbol('MEDIA_QUEUE');

export interface MediaQueuePublisher {
  enqueue(input: { originalAssetId: string; processingJobId: string }): Promise<void>;
}
