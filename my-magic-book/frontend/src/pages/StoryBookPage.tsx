// ─── Story Book Preview Page (Admin Only) ────────────────────────────────────
// Route: /book  and  /book/:storyId
// Protected by AdminBookGuard — only eyadat720@gmail.com can access.
// Customers see the normal public website; this page never appears for them.

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import StoryBook from '../components/book/StoryBook';
import { adminApi } from '../api/adminApi';
import { storyApi } from '../api/storyApi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function StoryBookPage() {
  const { storyId } = useParams<{ storyId?: string }>();
  const [searchParams] = useSearchParams();
  const [storyData, setStoryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [customPages, setCustomPages] = useState<any[]>([]);

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

  if (isLoading) return <div className="min-h-screen bg-[#03060e] flex items-center justify-center text-gold-500 font-arabic">جاري تحميل القصة...</div>;

  return (
    <div className="min-h-screen bg-[#03060e] pt-20 pb-20 px-2 sm:px-4">
      <StoryBook
        storyId={storyData?.theme || storyId || 'zoo_adventure'}
        childName={storyData?.childName || searchParams.get('name') || 'إياد'}
        childPhoto={storyData?.childPhoto || ''}
        audioUrl={storyData?.audioUrl || ''}
        showNameInput={!storyData}
        customPages={customPages.length > 0 ? customPages : undefined}
      />
    </div>
  );
}
