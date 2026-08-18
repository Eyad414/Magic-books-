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
/**
 * Generate an image from a prompt ALONE, with no reference photo.
 *
 * generateIllustration always sends the child's photo, because a personalised
 * book's whole point is that the child is in it. An IMPORTED book has no child
 * — it is somebody's finished manuscript — so its cover has nothing to
 * reference and that function refuses ("childPhotoUrl is empty"). Same model,
 * same retry and storage behaviour, minus the reference part.
 */
export declare function generateImageFromPrompt(prompt: string, opts?: {
    folder?: string;
    filename?: string;
}): Promise<StoredObject>;
export declare function generateIllustration(prompt: string, childPhotoUrl: string, opts?: GenerateOpts): Promise<StoredObject>;
export {};
//# sourceMappingURL=ImageGenerator.d.ts.map