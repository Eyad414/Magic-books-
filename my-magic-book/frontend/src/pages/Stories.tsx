import { useState, useEffect } from 'react';
import { Star, Lock, BookOpen, Eye, X, Sparkles, Heart } from 'lucide-react';
import FlipbookPreview from '../components/wizard/FlipbookPreview';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStoryProgress } from '../context/StoryProgressContext';
import toast from 'react-hot-toast';

const SAMPLE_STORIES = [
  { id: 1, theme: 'adventure', emoji: '🗺️', color: ['#1B1F5E', '#6C3FC5'], rating: 5.0 },
  { id: 2, theme: 'princess', emoji: '👸', color: ['#4a148c', '#6a1b9a'], rating: 4.9 },
  { id: 3, theme: 'space', emoji: '🚀', color: ['#006064', '#00838f'], rating: 5.0 },
  { id: 4, theme: 'ocean', emoji: '🌊', color: ['#1a237e', '#283593'], rating: 4.8 },
  { id: 5, theme: 'superhero', emoji: '⚡', color: ['#1b5e20', '#2e7d32'], rating: 5.0 },
  { id: 6, theme: 'forest', emoji: '🌿', color: ['#bf360c', '#d84315'], rating: 4.9 },
  { id: 7, theme: 'dinosaurs', emoji: '🦖', color: ['#33691e', '#558b2f'], rating: 5.0 },
  { id: 8, theme: 'robots', emoji: '🤖', color: ['#263238', '#455a64'], rating: 4.7 },
  { id: 9, theme: 'cooking', emoji: '👨‍🍳', color: ['#e65100', '#ef6c00'], rating: 4.9 },
  { id: 10, theme: 'music', emoji: '🎸', color: ['#311b92', '#512da8'], rating: 5.0 },
  { id: 11, theme: 'animals', emoji: '🦁', color: ['#f57f17', '#fbc02d'], rating: 4.8 },
  { id: 12, theme: 'magic', emoji: '🪄', color: ['#4a148c', '#7b1fa2'], rating: 5.0 },
  { id: 13, theme: 'space', emoji: '👨‍🚀', color: ['#0d47a1', '#1976d2'], rating: 5.0 },
  { id: 14, theme: 'space', emoji: '🛸', color: ['#01579b', '#0288d1'], rating: 4.9 },
  { id: 15, theme: 'adventure', emoji: '🎒', color: ['#e65100', '#fb8c00'], rating: 4.8 },
  { id: 16, theme: 'adventure', emoji: '🏫', color: ['#1b5e20', '#43a047'], rating: 5.0 },
  { id: 17, theme: 'ocean', emoji: '🧜‍♀️', color: ['#006064', '#00acc1'], rating: 4.9 },
  { id: 18, theme: 'magic', emoji: '🚗', color: ['#4a148c', '#9c27b0'], rating: 5.0 },
];

export default function Stories() {
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const { t } = useTranslation();
  const { resetProgress } = useStoryProgress();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('favorite_stories');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const toggleFavorite = (id: number) => {
    const isFav = favorites.includes(id);
    const newFavorites = isFav 
      ? favorites.filter(favId => favId !== id)
      : [...favorites, id];
    
    setFavorites(newFavorites);
    localStorage.setItem('favorite_stories', JSON.stringify(newFavorites));
    
    if (isFav) {
      toast.success(t('stories_page.remove_from_favorites'));
    } else {
      toast.success(t('stories_page.add_to_favorites'));
    }
  };

  const handleStartStory = (e: React.MouseEvent) => {
    e.preventDefault();
    resetProgress();
    navigate('/create');
  };

  const getStoryText = (id: number) => {
    const preview = t(`stories_page.samples.${id}_preview`);
    return `${preview} ${preview} ${t('stories_page.samples.preview_helper')}`;
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="font-arabic font-black text-white mb-4">
            {t('stories_page.title')} <span className="shimmer-text">{t('stories_page.title_shimmer')}</span>
          </h1>
          <p className="font-arabic text-white/50 text-lg">
            {t('stories_page.description')}
          </p>
        </div>

        {/* Preview Lock Banner */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gold-500/10 border border-gold-500/30 mb-10">
          <Lock className="w-5 h-5 text-gold-500 flex-shrink-0" />
          <p className="font-arabic text-white/70 text-sm">
            <strong className="text-gold-500">{t('stories_page.preview_system')}</strong> {t('stories_page.preview_desc')}
          </p>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_STORIES.map((story) => (
            <div key={story.id} className="glass-card glass-card-hover overflow-hidden group">
              {/* Cover */}
              <div
                className="h-40 flex items-center justify-center relative"
                style={{ background: `linear-gradient(135deg, ${story.color[0]}, ${story.color[1]})` }}
              >
                <span className="text-5xl group-hover:animate-float">{story.emoji}</span>
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-gold-500 px-2 py-1 rounded-lg">
                  <Star className="w-3 h-3 text-dark-900 fill-dark-900" />
                  <span className="font-arabic font-bold text-dark-900 text-xs">{story.rating}</span>
                </div>

                {/* Favorite Toggle */}
                <button 
                  onClick={() => toggleFavorite(story.id)}
                  className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    favorites.includes(story.id) 
                      ? 'bg-red-500 text-white shadow-lg scale-110' 
                      : 'bg-black/20 text-white/60 hover:bg-black/40 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${favorites.includes(story.id) ? 'fill-current' : ''}`} />
                </button>
              </div>

              <div className="p-5">
                <h3 className="font-arabic font-bold text-white text-lg mb-1">{t('stories_page.story_title', { name: t(`stories_page.samples.${story.id}_name`) })}</h3>
                <p className="font-arabic text-gold-500 text-xs mb-3">{t('stories_page.theme')} {t(`step2.theme_${story.theme}`)}</p>

                {/* Preview text with blur */}
                <div className="relative mb-4">
                  <div className="blur-preview">
                    <p className="font-arabic text-white/70 text-sm leading-relaxed">
                      {t(`stories_page.samples.${story.id}_preview`)}
                    </p>
                    <p className="font-arabic text-white/70 text-sm leading-relaxed mt-2">
                      {t('stories_page.preview_suffix')}
                    </p>
                  </div>
                </div>

                {/* Lock notice */}
                <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-dark-700 border border-white/10 mb-4 gap-2">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedStory(story)}
                      className="flex items-center gap-1 border-l border-white/10 pl-3 group cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-gold-500 group-hover:scale-125 transition-transform" />
                      <span className="font-arabic text-gold-500 text-xs border-b border-transparent group-hover:border-gold-500 transition-colors">{t('stories_page.available_30')}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-white/40" />
                      <span className="font-arabic text-white/40 text-xs">{t('stories_page.locked_70')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-white/60" />
                    <span className="font-arabic text-white/60 text-xs font-bold">{t('stories_page.order_to_complete')}</span>
                  </div>
                </div>

                <button 
                  onClick={handleStartStory}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-bold text-sm hover:shadow-gold-glow transition-all"
                >
                  ✨ {t('stories_page.start_creating')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Catchy Banner */}
        <div className="mt-12 flex items-center justify-center animate-fade-in-up">
          <div className="inline-flex flex-wrap items-center justify-center gap-4 px-8 py-5 rounded-3xl bg-gold-500/10 border border-gold-500/20 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-500/10 to-transparent animate-shimmer" />
            <span className="font-arabic font-bold text-white text-lg md:text-xl relative">{t('stories_page.more_stories')}</span>
            <span className="font-arabic font-black text-gold-500 text-2xl relative">=</span>
            <span className="flex items-center gap-2 relative">
              <span className="font-arabic font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-magic-400 to-cyan-400 drop-shadow-[0_2px_10px_rgba(192,132,252,0.4)] text-lg md:text-xl relative">{t('stories_page.more_memories')}</span>
              <span className="text-lg md:text-xl">📸</span>
            </span>
            <span className="font-arabic font-black text-gold-500 text-2xl relative">=</span>
            <span className="font-arabic font-bold text-gold-500 drop-shadow-[0_0_15px_rgba(245,166,35,0.6)] text-lg md:text-xl relative animate-pulse">{t('stories_page.more_happiness')}</span>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-14 glass-card p-10">
          <div className="text-5xl mb-4">🌟</div>
          <h2 className="font-arabic font-bold text-white text-2xl mb-3">
            {t('stories_page.want_custom_story')}
          </h2>
          <p className="font-arabic text-white/50 mb-6">
            {t('stories_page.custom_story_desc')}
          </p>
          <button 
            onClick={handleStartStory}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-xl hover:shadow-gold-glow hover:-translate-y-1 transition-all duration-300"
          >
            ✨ {t('stories_page.start_creating')}
          </button>
        </div>
      </div>

      {/* Flipbook Modal */}
      {selectedStory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in text-center">
          <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-md" onClick={() => setSelectedStory(null)} />
          
          <div className="relative w-full max-w-4xl glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-dark-900/95 p-6 md:p-8 pt-10">
            <button 
              onClick={() => setSelectedStory(null)} 
              className="absolute top-4 left-4 p-2 rounded-full bg-white/5 hover:bg-gold-500 hover:text-dark-900 text-white/50 transition-all z-20"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <h3 className="font-arabic font-black text-white text-2xl">
                {t('stories_page.modal_preview')} <span className="text-gold-500">{t(`stories_page.samples.${selectedStory.id}_name`)}</span>
              </h3>
              <p className="font-arabic text-white/50 text-sm mt-2 flex items-center justify-center gap-2">
                <Eye className="w-4 h-4 text-gold-500" />
                {t('stories_page.modal_desc')}
              </p>
            </div>
            
            <div className="my-8 flex justify-center">
              <FlipbookPreview text={getStoryText(selectedStory.id)} />
            </div>

            <div className="flex justify-center mt-6">
              <button 
                onClick={handleStartStory}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-bold text-lg hover:shadow-gold-glow hover:-translate-y-1 transition-all"
              >
                {t('stories_page.modal_cta')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


