export type ReferenceImage = { data: Buffer; mimeType: string };

export type IllustrationRequest = {
  prompt: string;
  /** Hard constraints; adapters fold these into the request appropriately. */
  negativePrompt: string;
  width: number;
  height: number;
  /** Approved Aadhi reference images for providers that support conditioning. */
  referenceImages: ReferenceImage[];
};

/** Image generation stays behind this interface (OpenAI, mock, future adapters). */
export interface ImageProvider {
  readonly name: string;
  readonly supportsReferenceImages: boolean;
  generateIllustration(req: IllustrationRequest): Promise<Buffer>; // PNG bytes
}
