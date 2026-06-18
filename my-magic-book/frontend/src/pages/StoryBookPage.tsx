// ─── Story Book Preview Page (Admin Only) ────────────────────────────────────
// Route: /book  and  /book/:storyId
// Protected by AdminBookGuard — only eyadat720@gmail.com can access.
// Customers see the normal public website; this page never appears for them.

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StoryBook from '../components/book/StoryBook';
import { adminApi } from '../api/adminApi';
import { storyApi } from '../api/storyApi';
import { useAuth } from '../context/AuthContext';
import { toDisplayUrl } from '../api/mediaUrl';
import toast from 'react-hot-toast';

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
    if (storyId && storyId !== 'zoo_adventure') {
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
          if (found) setStoryData(found);
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
          if (found) setStoryData(found);
          else toast.error('لم يتم العثور على القصة في قاعدة البيانات');
        }
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

  // The theme id used for both the static story lookup and the generate endpoint.
  const themeId = storyData?.theme || storyId || 'zoo_adventure';

  // Prefer the real customer photo; fall back to the generated portrait; else avatar.
  const childPhoto =
    toDisplayUrl(storyData?.childPhotoUrl) ||
    toDisplayUrl(generatedPortrait) ||
    '';

  // The actual uploaded photo for the back-cover circle (no avatar). In admin
  // preview (no real customer) we show a sample real photo from the bucket.
  const realPhoto =
    toDisplayUrl(storyData?.childPhotoUrl) ||
    toDisplayUrl('magic-fanoose/child-photos/0a0dfa24-99cd-434e-95e7-33b758439ff4.jpeg');

  return (
    <div className="min-h-screen bg-[#03060e] pt-20 pb-20 px-2 sm:px-4">
      <StoryBook
        storyId={themeId}
        childName={storyData?.childName || searchParams.get('name') || 'إياد'}
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
      />
    </div>
  );
}
