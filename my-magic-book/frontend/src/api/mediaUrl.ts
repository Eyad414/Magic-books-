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
 *   - http(s)://... or data:   -> returned unchanged
 *   - empty                    -> '' (caller decides fallback)
 */
export function toDisplayUrl(ref?: string): string {
  if (!ref) return '';
  if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('data:')) {
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
