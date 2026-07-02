import { StoredObject } from './StorageService';
interface GenerateOpts {
    pageNumber?: number;
    storyId?: string;
}
export declare const COST_PER_IMAGE_USD = 0.039;
export declare function imagesGeneratedSoFar(): number;
/**
 * Generates an illustration for a story page and persists it in GCS.
 * Calls Gemini 2.5 Flash Image with the per-page prompt and the customer's
 * kid photo as a reference, so the same face appears across all 13 pages.
 *
 * Cost: ~$0.039 per image as of late 2025. Only ever called from BookBuilder.
 */
export declare function generateIllustration(prompt: string, childPhotoUrl: string, opts?: GenerateOpts): Promise<StoredObject>;
export {};
//# sourceMappingURL=ImageGenerator.d.ts.map