import type { StoryConfig } from '../context/StoryProgressContext';

/**
 * Make sure the customer's story is saved, and return its id.
 *
 * A story chosen while signed out is not saved in step 2 — that needs an
 * account, and asking for one there turned people away before they had seen a
 * price (in the ten days measured, three people reached step 2 and none reached
 * step 3). Step 2 keeps the request instead (`pendingStory`), and this sends it
 * once they have signed in.
 *
 * Returns null only when there is genuinely nothing to save — the caller then
 * sends the customer back to choose a story rather than placing an order for
 * no book. `create` is passed in so this stays a plain function: the wizard
 * passes storyApi.create, a test passes a stub.
 */
export async function ensureStoryRecord(
  storyConfig: Partial<StoryConfig>,
  setStoryConfig: (data: Partial<StoryConfig>) => void,
  create: (data: object) => Promise<{ story?: { _id?: string } }>,
): Promise<string | null> {
  if (storyConfig.storyId) return storyConfig.storyId;
  if (!storyConfig.pendingStory) return null;
  const res = await create(storyConfig.pendingStory);
  const id = res?.story?._id;
  if (!id) throw new Error('story was not saved — no id in the response');
  setStoryConfig({ storyId: id, pendingStory: undefined });
  return id;
}
