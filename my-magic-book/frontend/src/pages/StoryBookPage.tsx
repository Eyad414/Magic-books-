// ─── Story Book Preview Page (Admin Only) ────────────────────────────────────
// Route: /book  and  /book/:storyId
// Protected by AdminBookGuard — only eyadat720@gmail.com can access.
// Customers see the normal public website; this page never appears for them.

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StoryBook from '../components/book/StoryBook';
import ColoringBookView from '../components/book/ColoringBookView';
import { localizeName } from '../utils/translit';
import { adminApi } from '../api/adminApi';
import { storyApi } from '../api/storyApi';
import { useAuth } from '../context/AuthContext';
import { toDisplayUrl } from '../api/mediaUrl';
import toast from 'react-hot-toast';

// Fixed REAL child photos for specific showcase books (keyed by ?pin= storyId).
// These override the AI page-99 portrait on the back cover + dedication so the
// demo shows the child's actual face. Uploaded to GCS by hand (see child-photos).
const REAL_BACK_PHOTOS: Record<string, string> = {
  '6a3bbaf645b418d21337de09': 'magic-fanoose/child-photos/lora-real.jpg', // Lora (zoo)
};

export default function StoryBookPage() {
  const { storyId } = useParams<{ storyId?: string }>();
  const [searchParams] = useSearchParams();
  const [storyData, setStoryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [customPages, setCustomPages] = useState<any[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatedPortrait, setGeneratedPortrait] = useState<string>('');
  const [generatedCover, setGeneratedCover] = useState<string>('');
  const { i18n } = useTranslation();

  const lngParam = searchParams.get('lng');

  useEffect(() => {
    if (lngParam) {
      i18n.changeLanguage(lngParam);
    }
  }, [lngParam, i18n]);

  useEffect(() => {
    if (storyId) {
      fetchStory();
    } else {
      setIsLoading(false);
    }
  }, [storyId, user]);

  const fetchStory = async () => {
    try {
      if (user?.role === 'admin') {
        const [storiesRes, settingsRes] = await Promise.all([
          adminApi.getAllStories(),
          adminApi.getSettings()
        ]);
        if (storiesRes.success) {
          const found = storiesRes.stories.find((s: any) => s._id === storyId);
          if (found) {
            setStoryData(found);
            // A real customer story may carry its own personalized illustrations.
            if (found.generatedImages?.length) setGeneratedImages(found.generatedImages);
            if (found.generatedPortrait) setGeneratedPortrait(found.generatedPortrait);
            if (found.generatedCover) setGeneratedCover(found.generatedCover);
          }
        }
        if (settingsRes.success) {
          const matchedTheme = settingsRes.settings.themes.find((t: any) => t.id === storyId);
          if (matchedTheme && matchedTheme.pages && matchedTheme.pages.length > 0) {
            setCustomPages(matchedTheme.pages);
          }
          if (matchedTheme?.generatedImages?.length) {
            setGeneratedImages(matchedTheme.generatedImages);
          }
          if (matchedTheme?.generatedPortrait) {
            setGeneratedPortrait(matchedTheme.generatedPortrait);
          }
          if (matchedTheme?.generatedCover) {
            setGeneratedCover(matchedTheme.generatedCover);
          }
        }
      } else {
        const res = await storyApi.getMyStories();
        if (res.success) {
          const found = res.stories.find((s: any) => s._id === storyId);
          if (found) {
            setStoryData(found);
            // Customer's personalized illustrations (generated after payment).
            if (found.generatedImages?.length) setGeneratedImages(found.generatedImages);
            if (found.generatedPortrait) setGeneratedPortrait(found.generatedPortrait);
            if (found.generatedCover) setGeneratedCover(found.generatedCover);
          } else {
            toast.error('لم يتم العثور على القصة في قاعدة البيانات');
          }
        }
      }
      // Pinned showcase book (?pin=<storyId>): load that book's exact generated
      // illustrations from storage (e.g. Lora's real zoo book), overriding the
      // generic theme images.
      const pin = searchParams.get('pin');
      if (pin) {
        setGeneratedCover(`magic-fanoose/generated/${pin}/page-00.png`);
        setGeneratedImages(
          Array.from({ length: 13 }, (_, i) => `magic-fanoose/generated/${pin}/page-${String(i + 1).padStart(2, '0')}.png`),
        );
        // page-99 is this book's own child portrait — used on the back cover so
        // it shows THIS child (e.g. Lora), not a generic sample photo.
        setGeneratedPortrait(`magic-fanoose/generated/${pin}/page-99.png`);
      }
    } catch (err) {
      console.error(err);
      toast.error('فشل في جلب بيانات القصة');
    } finally {
      setIsLoading(false);
    }
  };

  // Called by the StoryBook toolbar after a successful generation so the new
  // images appear without a full reload.
  const handleGenerated = (images: string[], portrait: string, cover?: string) => {
    setGeneratedImages(images);
    setGeneratedPortrait(portrait);
    if (cover) setGeneratedCover(cover);
  };

  if (isLoading) return <div className="min-h-screen bg-[#03060e] flex items-center justify-center text-gold-500 font-arabic">جاري تحميل القصة...</div>;

  // Coloring books render as a coloring layout (cover + line-art pages + back),
  // not as the 34-page story book.
  if (storyData?.bookPackage === 'coloring') {
    const placeMap: Record<string, string> = { zoo_coloring: 'حديقة الحيوانات', space_coloring: 'الفضاء', school_coloring: 'المدرسة' };
    return (
      <ColoringBookView
        childName={localizeName(storyData.childName || 'طفلك', i18n.language)}
        place={placeMap[storyData.theme] || ''}
        cover={toDisplayUrl(generatedCover)}
        backCover={toDisplayUrl(generatedPortrait)}
        pages={generatedImages.map(toDisplayUrl)}
      />
    );
  }

  // The theme id used for both the static story lookup and the generate endpoint.
  const themeId = storyData?.theme || storyId || 'zoo_adventure';

  // A fixed real photo for this showcase book (e.g. Lora), if one is registered.
  const pinnedRealPhoto = REAL_BACK_PHOTOS[searchParams.get('pin') || ''] || '';

  // Prefer the real customer photo; fall back to the generated portrait; else avatar.
  const childPhoto =
    toDisplayUrl(storyData?.childPhotoUrl) ||
    toDisplayUrl(generatedPortrait) ||
    '';

  // Back-cover circle photo: the real customer photo → else THIS book's own
  // child portrait (page-99, e.g. Lora) → else a sample. Never a mismatched kid.
  const realPhoto =
    toDisplayUrl(storyData?.childPhotoUrl) ||
    toDisplayUrl(generatedPortrait) ||
    toDisplayUrl('magic-fanoose/child-photos/d814d243-9300-489d-b275-29144c91ad19.jpeg');

  return (
    <div className="min-h-screen bg-[#03060e] pt-20 pb-20 px-2 sm:px-4">
      <StoryBook
        storyId={themeId}
        childName={storyData?.childName || searchParams.get('name') || 'بهاء'}
        childGender={storyData?.childGender}
        childPhoto={childPhoto}
        realPhoto={realPhoto}
        coverScene={toDisplayUrl(generatedCover)}
        backCoverPhoto={toDisplayUrl(generatedPortrait) || childPhoto}
        audioUrl={storyData?.audioUrl || ''}
        showNameInput={!storyData}
        customPages={customPages.length > 0 ? customPages : undefined}
        generatedImages={generatedImages.map(toDisplayUrl)}
        onGenerated={handleGenerated}
        /* Raw GCS paths for the server-side "Download print-ready PDF" build. */
        rawCoverPath={generatedCover}
        rawBackPath={generatedPortrait}
        rawImagePaths={generatedImages}
        /* Back-cover circle: real customer photo → this book's own child portrait
           (page-99, matches the story) → sample. Never a mismatched child. */
        rawChildPhotoPath={pinnedRealPhoto || storyData?.childPhotoUrl || generatedPortrait || 'magic-fanoose/child-photos/d814d243-9300-489d-b275-29144c91ad19.jpeg'}
        /* Pre-set REAL back-cover photo for a pinned showcase book (e.g. Lora). */
        realPhotoPath={pinnedRealPhoto}
      />
    </div>
  );
}
