import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

/**
 * "Continue with Google".
 *
 * Google renders the button itself into this div — its script owns the wording,
 * the branding and the consent flow, which is what their terms require. We only
 * hand it a callback and pass the resulting ID token to our own API, where it
 * is verified before anyone is signed in.
 *
 * With no VITE_GOOGLE_CLIENT_ID set the component renders nothing, rather than
 * showing a button that cannot work.
 */
export default function GoogleButton({ onDone }: { onDone?: () => void }) {
  const { loginWithGoogle } = useAuth();
  const { i18n } = useTranslation();
  const holder = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !holder.current) return;

    const start = () => {
      const g = (window as any).google?.accounts?.id;
      if (!g || !holder.current) return false;
      g.initialize({
        client_id: clientId,
        callback: async (resp: any) => {
          if (!resp?.credential) return;
          try {
            await loginWithGoogle(resp.credential);
            onDone?.();
          } catch {
            /* the page shows its own error; nothing useful to add here */
          }
        },
      });
      g.renderButton(holder.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        width: 320,
        locale: i18n.language,
      });
      return true;
    };

    if (start()) return;
    // Loaded lazily and once: a visitor who never opens the login page should
    // not pay for Google's SDK on every page view.
    const existing = document.getElementById('gsi-script');
    if (existing) { existing.addEventListener('load', start, { once: true }); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.id = 'gsi-script';
    s.onload = start;
    document.head.appendChild(s);
  }, [clientId, i18n.language, loginWithGoogle, onDone]);

  if (!clientId) return null;
  return <div className="flex justify-center my-4" ref={holder} />;
}
