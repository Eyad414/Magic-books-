import { useEffect, useState } from 'react';
import { publicApi } from '../api/publicApi';

/** Owner-controlled feature switches from the admin dashboard. */
export interface SiteFlags {
  /** Step 1 may offer "no photo" (off = a child photo is required). */
  allowSkipPhoto: boolean;
  /** Step 2 may offer the "write with AI" story mode. */
  aiModeEnabled: boolean;
}

const DEFAULTS: SiteFlags = { allowSkipPhoto: false, aiModeEnabled: false };

// Module-level cache: the wizard mounts several steps that all want the flags,
// and the settings payload never changes mid-session. Fetch it once.
let cache: SiteFlags | null = null;
let inflight: Promise<SiteFlags> | null = null;

function load(): Promise<SiteFlags> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = publicApi.getSettings()
      .then((res) => {
        cache = {
          allowSkipPhoto: !!res?.settings?.allowSkipPhoto,
          aiModeEnabled: !!res?.settings?.aiModeEnabled,
        };
        return cache;
      })
      .catch(() => DEFAULTS) // offline / API down → safest is "features hidden"
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function useSiteFlags(): SiteFlags {
  const [flags, setFlags] = useState<SiteFlags>(cache || DEFAULTS);
  useEffect(() => {
    let alive = true;
    load().then((f) => { if (alive) setFlags(f); });
    return () => { alive = false; };
  }, []);
  return flags;
}
