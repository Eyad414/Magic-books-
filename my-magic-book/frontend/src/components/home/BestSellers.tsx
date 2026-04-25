import { Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const bestSellers = [
  {
    id: 1,
    title: 'بطل الفضاء',
    theme: 'space',
    emoji: '🚀',
    description: 'رحلة مثيرة في أعماق الكون بحثاً عن نجم ضائع',
    rating: 4.9,
    reviews: 128,
    price: 99,
    tag: 'الأكثر مبيعاً',
    colors: ['#1a237e', '#311b92'],
    age: '٤-١٢ سنة',
  },
  {
    id: 2,
    title: 'أميرة الغابة',
    theme: 'forest',
    emoji: '🌿',
    description: 'مغامرة ساحرة في غابة سرية مليئة بالحيوانات الناطقة',
    rating: 4.8,
    reviews: 94,
    price: 99,
    tag: 'جديد',
    colors: ['#1b5e20', '#2e7d32'],
    age: '٣-١٠ سنة',
  },
  {
    id: 3,
    title: 'البطل الخارق',
    theme: 'superhero',
    emoji: '⚡',
    description: 'يكتشف طفلك قوى خارقة ويصبح منقذ المدينة',
    rating: 5.0,
    reviews: 76,
    price: 99,
    tag: 'مميز',
    colors: ['#4a148c', '#6a1b9a'],
    age: '٥-١٢ سنة',
  },
  {
    id: 4,
    title: 'مغامرة المحيط',
    theme: 'ocean',
    emoji: '🌊',
    description: 'رحلة تحت الماء مع أصدقاء البحر الودودين',
    rating: 4.7,
    reviews: 61,
    price: 99,
    tag: '',
    colors: ['#006064', '#00838f'],
    age: '٢-٩ سنة',
  },
];

export default function BestSellers() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-500 font-arabic text-sm mb-4">
              <TrendingUp className="w-4 h-4" />
              <span>الأكثر طلباً</span>
            </div>
            <h2 className="font-arabic font-black text-white">
              قصص <span className="shimmer-text">يحبها الأطفال</span>
            </h2>
          </div>
          <Link to="/stories" className="font-arabic text-gold-500 text-sm hover:underline hidden sm:block">
            عرض الكل ←
          </Link>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((book) => (
            <div
              key={book.id}
              className="glass-card glass-card-hover p-0 overflow-hidden"
            >
              {/* Book cover mockup */}
              <div
                className="h-48 flex flex-col items-center justify-center relative"
                style={{ background: `linear-gradient(135deg, ${book.colors[0]}, ${book.colors[1]})` }}
              >
                <span className="text-6xl mb-2 animate-float">{book.emoji}</span>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
                {book.tag && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-gold-500 text-dark-900 font-arabic font-bold text-xs">
                    {book.tag}
                  </div>
                )}
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/40 text-white/80 font-arabic text-xs">
                  {book.age}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-arabic font-bold text-white text-lg mb-1">{book.title}</h3>
                <p className="font-arabic text-white/50 text-xs mb-3 leading-relaxed">{book.description}</p>

                <div className="flex items-center justify-start">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-gold-500 fill-gold-500" />
                    <span className="text-gold-500 font-bold text-sm">{book.rating}</span>
                    <span className="text-white/30 text-xs">({book.reviews})</span>
                  </div>
                </div>

                <Link
                  to="/create"
                  id={`bestseller-cta-${book.id}`}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-500 font-arabic font-bold text-sm hover:bg-gold-500/20 transition-all"
                >
                  اطلب مخصصاً ✨
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
