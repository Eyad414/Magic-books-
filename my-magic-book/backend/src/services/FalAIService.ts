/**
 * fal.ai Integration Service
 *
 * Two-step illustration pipeline:
 *  1. generateBaseScene()  — called ONCE per story template page (admin/first-run).
 *     Uses flux/schnell to create a scene with a generic child silhouette.
 *     Result is cached so every child re-uses the same background.
 *  2. swapFaceIntoScene()  — called for EACH child's story.
 *     face-swap model replaces the generic face with the child's real photo.
 *     Background, lighting, and scene details remain unchanged.
 */

import { fal } from '@fal-ai/client';

// Configure on first import
fal.config({ credentials: process.env.FAL_AI_API_KEY || '' });

/* ─── 1. Base-scene generator ──────────────────────────────────────────────── */

export interface BaseSceneResult {
  imageUrl: string;
}

/**
 * Generate a base scene illustration for a story page.
 * The main character should have an indistinct / back-facing face so the
 * face-swap in step 2 has a clear target.
 */
export async function generateBaseScene(
  scenePrompt: string
): Promise<BaseSceneResult> {
  if (!process.env.FAL_AI_API_KEY) {
    // Return placeholder when key not configured
    return { imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' };
  }

  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt: [
        "Children's book illustration, warm colorful cartoon style,",
        'soft pastel colors, friendly atmosphere, Arabic cultural elements:',
        scenePrompt,
        '— the main child character faces away or has a neutral/blurred face',
        'so it can be personalised. Square format, no text.',
      ].join(' '),
      image_size: 'square_hd',   // 1024×1024
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: true,
    },
  });

  const images = (result as any).data?.images;
  if (!images || images.length === 0) {
    throw new Error('fal.ai flux/schnell returned no images');
  }
  return { imageUrl: images[0].url };
}

/* ─── 2. Face-swap ─────────────────────────────────────────────────────────── */

export interface FaceSwapResult {
  imageUrl: string;
}

/**
 * Swap the child's face from `childPhotoUrl` into `baseSceneUrl`.
 * The scene background, lighting, and details stay intact; only the face changes.
 */
export async function swapFaceIntoScene(
  baseSceneUrl: string,
  childPhotoUrl: string
): Promise<FaceSwapResult> {
  if (!process.env.FAL_AI_API_KEY) {
    // Return the base scene unchanged as placeholder
    return { imageUrl: baseSceneUrl };
  }

  const result = await fal.subscribe('fal-ai/face-swap', {
    input: {
      base_image_url: baseSceneUrl,
      swap_image_url: childPhotoUrl,
    },
  });

  const images = (result as any).data?.images;
  if (!images || images.length === 0) {
    throw new Error('fal.ai face-swap returned no images');
  }
  return { imageUrl: images[0].url };
}

/* ─── 3. Convenience: generate all 13 illustrations for one child ───────────── */

export interface IllustrationJob {
  pageIndex: number;        // 0-based index among the 13 image pages
  baseSceneUrl: string;     // pre-generated scene (same for all children)
  childPhotoUrl: string;    // this child's face
}

/**
 * Run up to `concurrency` face-swap jobs in parallel.
 * Returns URLs in the same order as the input jobs array.
 */
export async function generateAllIllustrations(
  jobs: IllustrationJob[],
  concurrency = 3
): Promise<string[]> {
  const results: string[] = new Array(jobs.length).fill('');

  // Process in batches
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((job) => swapFaceIntoScene(job.baseSceneUrl, job.childPhotoUrl))
    );
    batchResults.forEach((r, idx) => {
      results[i + idx] = r.imageUrl;
    });
  }
  return results;
}
