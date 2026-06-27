// ─── Coloring Book Viewer (Admin) ────────────────────────────────────────────
// Route: /coloring/:themeId?name=...
// A coloring book = one full-color creative FRONT cover (with the child's name
// overlaid) + 16 black-and-white line-art pages + one creative BACK cover.
// No story text at all — just pictures the child colors in.

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/adminApi';
import { toDisplayUrl } from '../api/mediaUrl';
import { localizeName } from '../utils/translit';
import ColoringBookView from '../components/book/ColoringBookView';

export default function ColoringBookPage() {
  const { themeId } = useParams<{ themeId: string }>();
  const [params] = useSearchParams();
  const { i18n } = useTranslation();
  // Show the child's name in the site's language (Arabic UI → بهاء, English → Baha).
  const rawName = params.get('name') || (i18n.language?.startsWith('ar') ? 'طفلك' : 'your child');
  const childName = localizeName(rawName, i18n.language);

  const [cover, setCover] = useState('');
  const [backCover, setBackCover] = useState('');
  const [pages, setPages] = useState<string[]>([]);
  const [place, setPlace] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getSettings().then((res) => {
      if (res.success) {
        const theme = res.settings.themes.find((t: any) => t.id === themeId);
        if (theme) {
          setCover(toDisplayUrl(theme.generatedCover));
          setBackCover(toDisplayUrl(theme.generatedPortrait));
          setPages((theme.generatedImages || []).map(toDisplayUrl));
          // "كتاب تلوين: حديقة الحيوانات" → "حديقة الحيوانات"
          setPlace((theme.label || '').replace(/^كتاب\s*تلوين\s*:?\s*/, '').trim());
        }
      }
    }).finally(() => setLoading(false));
  }, [themeId]);

  if (loading) {
    return <div className="min-h-screen bg-[#03060e] flex items-center justify-center text-gold-500 font-arabic">جاري التحميل...</div>;
  }

  return <ColoringBookView childName={childName} place={place} cover={cover} backCover={backCover} pages={pages} />;
}
