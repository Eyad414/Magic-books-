// Helpers for turning GCS references into browser-loadable image URLs.
// The bucket blocks public access, so private objects are served through the
// backend image proxy: GET /api/uploads/image?path=<objectPath>.

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://magicfanoos-api-us.onrender.com/api' : 'http://localhost:5001/api');

/** Convert a GCS object path (e.g. "magic-fanoose/generated/..png") to a proxy URL. */
export function objectPathToUrl(objectPath: string): string {
  return `${API_BASE}/uploads/image?path=${encodeURIComponent(objectPath)}`;
}

/**
 * Normalize any image reference into something an <img> can load:
 *   - gs://bucket/path         -> proxy URL (strip bucket, keep object path)
 *   - magic-fanoose/...        -> proxy URL
 *   - http(s)://, data:, blob: -> returned unchanged
 *   - empty                    -> '' (caller decides fallback)
 */
export function toDisplayUrl(ref?: string): string {
  if (!ref) return '';
  // blob: belongs here too — a just-picked File previewed via
  // URL.createObjectURL is already loadable, and falling through to the proxy
  // turned it into a broken .../uploads/image?path=blob%3A… request.
  if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('data:') || ref.startsWith('blob:')) {
    return ref;
  }
  if (ref.startsWith('gs://')) {
    const without = ref.slice('gs://'.length);
    const slash = without.indexOf('/');
    return objectPathToUrl(without.slice(slash + 1));
  }
  // Treat anything else as a bucket object path.
  return objectPathToUrl(ref);
}

/**
 * The same image, sized for a card.
 *
 * A generated cover is a ~2.4MB PNG at full generation size, and a card renders
 * it around 340px wide. Four of those on the home page is ~9MB and the stories
 * page has twenty — which is what a visitor arriving from Instagram on a phone
 * would have had to download before seeing anything.
 *
 * `w` is a hint: the backend rounds it to a width it is willing to build, makes
 * the WebP once, and serves the original if it cannot. Use it for cards and
 * thumbnails; the book preview and anything a customer reads stays full-res.
 */
export function toCardUrl(ref?: string, w: number = 480): string {
  const url = toDisplayUrl(ref);
  if (!url || !url.includes('/uploads/image?path=')) return url;
  return `${url}&w=${w}`;
}
