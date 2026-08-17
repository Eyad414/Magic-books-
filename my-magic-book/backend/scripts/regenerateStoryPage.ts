/**
 * Regenerate ONE interior page of an existing book.
 *
 * A single bad page — Gemini stamping invented lettering into the artwork is
 * the usual reason — otherwise means rebuilding the order, which redraws all
 * 15 images and rerolls the ones that were already right.
 *
 * The page keeps its object path (page-NN.png is overwritten), so the story's
 * generatedImages array stays valid and nothing else has to be updated.
 *
 *   npx tsx scripts/regenerateStoryPage.ts <storyId> <pageNumber> "<prompt>"
 *   npx tsx scripts/regenerateStoryPage.ts <storyId> <pageNumber> "<prompt>" --apply
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Story from '../src/models/Story';
import { generateIllustration } from '../src/services/ImageGenerator';

const COST_PER_IMAGE_USD = 0.039;

(async () => {
  const [storyId, pageArg, prompt] = process.argv.slice(2);
  const apply = process.argv.includes('--apply');
  const page = Number(pageArg);
  if (!storyId || !Number.isInteger(page) || !prompt) {
    throw new Error('usage: regenerateStoryPage.ts <storyId> <pageNumber> "<prompt>" [--apply]');
  }

  await mongoose.connect(process.env.MONGODB_URI as string);
  const story: any = await Story.findById(storyId);
  if (!story) throw new Error(`story ${storyId} not found`);

  const childPhoto = String(story.childPhotoUrl || '').trim();
  if (!childPhoto) throw new Error('story has no child photo — generation needs a reference');

  const existing = (story.generatedImages || [])[page - 1];
  console.log(`story ${storyId} — ${story.childName} (${story.theme})`);
  console.log(`page ${page} currently: ${existing || '(not in generatedImages)'}`);
  console.log(`cost: $${COST_PER_IMAGE_USD.toFixed(3)}`);
  console.log(`\nprompt:\n${prompt}\n`);

  if (!apply) {
    console.log('DRY RUN — pass --apply to generate.');
    await mongoose.disconnect();
    return;
  }

  const img = await generateIllustration(prompt, childPhoto, { storyId, pageNumber: page });
  // Overwriting page-NN.png keeps the stored path correct; only write to the
  // array if this page was somehow missing from it.
  if (existing !== img.objectPath) {
    const images = [...(story.generatedImages || [])];
    images[page - 1] = img.objectPath;
    story.generatedImages = images;
    await story.save();
    console.log('generatedImages updated');
  }
  console.log(`done → ${img.objectPath}  ($${COST_PER_IMAGE_USD.toFixed(3)})`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
