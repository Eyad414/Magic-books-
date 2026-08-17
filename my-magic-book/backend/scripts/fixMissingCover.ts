/**
 * Generate ONLY the missing cover and/or back portrait for one story.
 *
 * A paid e-book was delivered with all 13 interior pages but no cover and no
 * back portrait, and the order still read "ready" — the status only looks at
 * the interior pages. Rebuilding the order through buildBookForOrder would
 * regenerate all 15 images: it would cost 15x and, because the model is not
 * deterministic, would also reroll 13 pages that are already fine.
 *
 * So this fills in exactly what is missing, using the same prompts the build
 * uses (same template, same resolved gender, same reference photo), and skips
 * anything already present unless --force is passed.
 *
 *   npx tsx scripts/fixMissingCover.ts <storyId>            # dry run
 *   npx tsx scripts/fixMissingCover.ts <storyId> --apply
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Story from '../src/models/Story';
import { getSceneTemplate, buildScenePrompt, resolveGender } from '../src/services/sceneTemplates';
import { generateIllustration } from '../src/services/ImageGenerator';
import { objectExists, pdfFolderPath } from '../src/services/StorageService';

const COST_PER_IMAGE_USD = 0.039;

(async () => {
  const storyId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!storyId) throw new Error('usage: fixMissingCover.ts <storyId> [--apply]');

  await mongoose.connect(process.env.MONGODB_URI as string);
  const story: any = await Story.findById(storyId);
  if (!story) throw new Error(`story ${storyId} not found`);

  // Themes WITH a scene template get the photoreal cover wrapper the normal
  // build uses. Themes without one (space_real, and any other "photoreal"
  // wizard variant) are built through BookBuilder's fallback path, which
  // derives every prompt from the page text in a soft illustrated style and
  // never makes a cover at all — so a photoreal cover would clash with all 13
  // interior pages. Those need their prompts passed in, matching the style the
  // book was actually drawn in.
  const template = getSceneTemplate(story.theme);
  const argPrompt = (flag: string): string | undefined => {
    const i = process.argv.indexOf(flag);
    return i > -1 ? process.argv[i + 1] : undefined;
  };
  const coverPromptArg = argPrompt('--cover-prompt');
  const portraitPromptArg = argPrompt('--portrait-prompt');
  if ((!template?.coverScene || !template?.portraitScene) && !(coverPromptArg && portraitPromptArg)) {
    throw new Error(
      `theme ${story.theme} has no cover/portrait scene — pass --cover-prompt "..." and --portrait-prompt "..." ` +
      `written in the same style as the book's interior pages`,
    );
  }
  const childPhoto = String(story.childPhotoUrl || '').trim();
  if (!childPhoto) throw new Error('story has no child photo — generation needs a reference');

  const gender = resolveGender(story.childName, story.childGender);
  const sid = String(story._id);
  const force = process.argv.includes('--force');

  const jobs: { name: string; page: number; prompt: string; field: 'generatedCover' | 'generatedPortrait' }[] = [];
  if (force || !(await objectExists(pdfFolderPath(`generated/${sid}`, 'page-00.png')))) {
    jobs.push({
      name: 'cover',
      page: 0,
      field: 'generatedCover',
      prompt: coverPromptArg || buildScenePrompt('cover', template!.coverScene!, story.childName, gender),
    });
  }
  if (force || !(await objectExists(pdfFolderPath(`generated/${sid}`, 'page-99.png')))) {
    jobs.push({
      name: 'portrait',
      page: 99,
      field: 'generatedPortrait',
      prompt: portraitPromptArg || buildScenePrompt('portrait', template!.portraitScene!, story.childName, gender),
    });
  }

  console.log(`story ${sid} — ${story.childName} (${story.theme}), art gender: ${gender}`);
  console.log(`interior pages already present: ${(story.generatedImages || []).length} (untouched)`);
  console.log(`to generate: ${jobs.map((j) => j.name).join(', ') || 'nothing — both already exist'}`);
  console.log(`cost: $${(jobs.length * COST_PER_IMAGE_USD).toFixed(3)}`);

  if (!apply || !jobs.length) {
    console.log(apply ? '\nnothing to do.' : '\nDRY RUN — pass --apply to generate.');
    await mongoose.disconnect();
    return;
  }

  for (const job of jobs) {
    const img = await generateIllustration(job.prompt, childPhoto, { storyId: sid, pageNumber: job.page });
    story[job.field] = img.objectPath;
    console.log(`  ${job.name} → ${img.objectPath}`);
  }
  await story.save();
  console.log(`\nsaved. spent $${(jobs.length * COST_PER_IMAGE_USD).toFixed(3)}`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
