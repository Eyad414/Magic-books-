import { useState } from 'react';
import { User } from 'lucide-react';
import { withWidth } from '../../api/mediaUrl';

/**
 * The child's own photo, beside their name on an order.
 *
 * The order card named the child and described the book but never showed who
 * it was for, so checking that a finished book matches the right child meant
 * opening the story. The reference photo the customer uploaded is the one
 * thing that answers it at a glance.
 *
 * Loaded through the card sizer, not raw: these are phone camera uploads of a
 * couple of megabytes, and an orders list holds twenty of them. Clicking opens
 * the full-size original, which is what you want when judging a likeness.
 *
 * `photoUrl` is the SIGNED url the API minted for this admin, not the stored
 * object path — the proxy refuses a child photo without a signature.
 */
export function ChildAvatar({ photoUrl, name, size = 44 }: { photoUrl?: string; name?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = withWidth(photoUrl || '', 320);

  // No photo at all, or the object is gone from the bucket: say so quietly
  // rather than leaving a broken frame on the card.
  if (!photoUrl || failed) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-white/10 border border-white/15 shrink-0"
        style={{ width: size, height: size }}
        title={failed ? 'تعذّر تحميل صورة الطفل' : 'لا توجد صورة للطفل في هذا الطلب'}
      >
        <User className="w-4 h-4 text-white/35" />
      </span>
    );
  }

  return (
    <a
      href={photoUrl}
      target="_blank"
      rel="noreferrer"
      className="shrink-0 rounded-full ring-1 ring-white/15 hover:ring-gold-500/60 transition-all"
      title="اضغط لفتح الصورة بالحجم الكامل"
    >
      <img
        src={src}
        alt={name ? `صورة ${name}` : 'صورة الطفل'}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    </a>
  );
}
