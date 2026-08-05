import { Request, Response } from 'express';
import Order from '../models/Order';
import ContactMessage from '../models/ContactMessage';
import { generateIllustration } from '../services/ImageGenerator';
import { objectExists, pdfFolderPath, getReadSignedUrl } from '../services/StorageService';
import { getSceneTemplate, buildScenePrompt, resolveGender } from '../services/sceneTemplates';

/**
 * How many cover previews an account may generate before it has bought
 * anything. Each preview is a real Gemini image (~$0.039), so this is a hard
 * spend cap, not a nudge. The allowance refills whenever one of the user's
 * orders is marked paid.
 */
export const FREE_COVER_PREVIEWS = 5;

/** Only these keep their own scene template; suffixed variants share the base. */
const baseTheme = (themeId: string) => themeId.replace(/_(real|photoreal|cartoon|pr|hd)$/, '');

/**
 * POST /api/stories/cover-preview
 *
 * Renders JUST the front cover for the child in the wizard, so the customer can
 * see their own kid on the cover before paying. Deliberately triggered by a
 * button in step 2 — never on theme browsing, which would bill for every click.
 */
export const generateCoverPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { childName, childGender, childPhotoUrl, theme } = req.body || {};

    if (!childPhotoUrl || !String(childPhotoUrl).trim()) {
      res.status(400).json({ success: false, message: 'يجب رفع صورة الطفل أولاً' });
      return;
    }
    if (!theme) {
      res.status(400).json({ success: false, message: 'يجب اختيار موضوع القصة' });
      return;
    }

    const template = getSceneTemplate(theme) || getSceneTemplate(baseTheme(theme));
    if (!template?.coverScene) {
      res.status(400).json({ success: false, message: 'هذه القصة لا تدعم معاينة الغلاف بعد' });
      return;
    }

    // The same child + same theme always maps to the same object, so re-opening
    // a cover the customer already generated is free and instant. Gemini picks
    // the format, so check BOTH extensions generateIllustration can write —
    // missing the cache here would silently re-charge for an identical image.
    const slug = `${String(user._id)}-${baseTheme(theme)}`;
    const folder = `generated/preview-${slug}`;
    for (const ext of ['png', 'jpg']) {
      const candidate = pdfFolderPath(folder, `page-00.${ext}`);
      if (await objectExists(candidate)) {
        res.json({
          success: true,
          cached: true,
          objectPath: candidate,
          signedUrl: await getReadSignedUrl(candidate).catch(() => ''),
          used: countUsedSince(user, await lastPaidAt(user._id)),
          limit: FREE_COVER_PREVIEWS,
        });
        return;
      }
    }

    // ── Quota: count only the previews made since the last paid order ──
    const paidAt = await lastPaidAt(user._id);
    const used = countUsedSince(user, paidAt);

    if (used >= FREE_COVER_PREVIEWS) {
      await notifyOwnerOnce(user, used);
      res.status(429).json({
        success: false,
        limitReached: true,
        used,
        limit: FREE_COVER_PREVIEWS,
        message:
          `لقد أنشأت ${used} أغلفة تجريبية لطفلك دون إتمام أي طلب. ` +
          `إنشاء كل غلاف يستهلك رصيد الذكاء الاصطناعي، لذلك يرجى إتمام طلبك للمتابعة. ` +
          `بعد أي عملية شراء ستحصل على ${FREE_COVER_PREVIEWS} معاينات جديدة.`,
      });
      return;
    }

    const gender = resolveGender(childName, childGender === 'female' ? 'female' : 'male');
    const prompt = buildScenePrompt('cover', template.coverScene, childName || '', gender);

    const stored = await generateIllustration(prompt, childPhotoUrl, {
      storyId: `preview-${slug}`,
      pageNumber: 0,
    });

    // Record the spend only after the image actually came back, so a failed
    // generation never eats the customer's allowance.
    const stamps = [...(user.coverPreviews || []), new Date()];
    user.coverPreviews = stamps.slice(-50);
    await user.save();

    const nowUsed = countUsedSince(user, paidAt);
    if (nowUsed >= FREE_COVER_PREVIEWS) await notifyOwnerOnce(user, nowUsed);

    res.json({
      success: true,
      cached: false,
      objectPath: stored.objectPath,
      signedUrl: stored.signedUrl,
      used: nowUsed,
      limit: FREE_COVER_PREVIEWS,
    });
  } catch (error: any) {
    console.error('[coverPreview] failed:', error);
    res.status(500).json({ success: false, message: 'تعذّر إنشاء الغلاف، حاول مرة أخرى' });
  }
};

/** GET /api/stories/cover-preview/quota — how many previews are left. */
export const getCoverPreviewQuota = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const used = countUsedSince(user, await lastPaidAt(user._id));
    res.json({ success: true, used, limit: FREE_COVER_PREVIEWS, remaining: Math.max(0, FREE_COVER_PREVIEWS - used) });
  } catch {
    res.json({ success: true, used: 0, limit: FREE_COVER_PREVIEWS, remaining: FREE_COVER_PREVIEWS });
  }
};

/** When this user last paid for anything (undefined = never bought). */
async function lastPaidAt(userId: any): Promise<Date | undefined> {
  const order = await Order.findOne({ userId, paymentStatus: 'paid' }).sort({ updatedAt: -1 }).select('updatedAt');
  return (order as any)?.updatedAt;
}

/**
 * Previews generated since the given moment. Deriving the count this way (rather
 * than resetting a counter when an order is paid) means the allowance refills
 * itself no matter which code path marks the order paid — cash-on-delivery in
 * the dashboard today, a payment gateway later.
 */
function countUsedSince(user: any, since?: Date): number {
  const stamps: Date[] = user.coverPreviews || [];
  if (!since) return stamps.length;
  return stamps.filter((d) => new Date(d).getTime() > new Date(since).getTime()).length;
}

/**
 * Drop one note in the owner's inbox the first time an account hits the cap, so
 * they can follow up. Guarded so a customer retrying can't flood the inbox, and
 * never allowed to break the request it is attached to.
 */
async function notifyOwnerOnce(user: any, used: number): Promise<void> {
  try {
    const subject = 'تنبيه: استهلاك معاينات الأغلفة';
    const already = await ContactMessage.findOne({ email: user.email, subject });
    if (already) return;
    await ContactMessage.create({
      name: user.name,
      email: user.email,
      subject,
      message:
        `أنشأ هذا العميل ${used} أغلفة تجريبية بالذكاء الاصطناعي دون إتمام أي طلب، ` +
        `وتم إيقاف إنشاء المزيد له. التكلفة التقريبية: $${(used * 0.039).toFixed(2)}.`,
    });
  } catch (err: any) {
    console.warn('[coverPreview] owner notification skipped:', err.message);
  }
}
