import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storyApi } from '../api/storyApi';
import { orderApi } from '../api/orderApi';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Package, Plus, Clock, CheckCircle, Sparkles } from 'lucide-react';
import MagicButton from '../components/common/MagicButton';

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<'stories' | 'orders'>('stories');
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/login');
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([storyApi.getMyStories(), orderApi.getMyOrders()])
        .then(([storiesRes, ordersRes]) => {
          setStories(storiesRes.stories || []);
          setOrders(ordersRes.orders || []);
        })
        .catch(() => {})
        .finally(() => setIsFetching(false));
    }
  }, [isAuthenticated]);

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: 'مسودة', color: 'text-white/50', icon: Clock },
    generating: { label: 'يتم التوليد...', color: 'text-magic-400', icon: Sparkles },
    ready: { label: 'جاهزة', color: 'text-green-400', icon: CheckCircle },
    ordered: { label: 'مطلوبة', color: 'text-gold-500', icon: Package },
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-arabic font-black text-white text-3xl">
              مرحباً، <span className="shimmer-text">{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="font-arabic text-white/50 mt-1">قصصك السحرية وطلباتك</p>
          </div>
          <Link to="/create">
            <MagicButton id="dashboard-create-btn" icon={<Plus className="w-4 h-4" />}>
              قصة جديدة
            </MagicButton>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'قصصي', value: stories.length, emoji: '📖', color: 'magic' },
            { label: 'طلباتي', value: orders.length, emoji: '📦', color: 'gold' },
            { label: 'مكتملة', value: orders.filter((o) => o.paymentStatus === 'paid').length, emoji: '✅', color: 'green' },
            { label: 'في الانتظار', value: orders.filter((o) => o.paymentStatus === 'pending').length, emoji: '⏳', color: 'orange' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 text-center">
              <div className="text-2xl mb-1">{stat.emoji}</div>
              <div className="font-arabic font-black text-white text-2xl">{stat.value}</div>
              <div className="font-arabic text-white/40 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'stories', label: 'قصصي', icon: BookOpen },
            { id: 'orders', label: 'طلباتي', icon: Package },
          ].map((t) => (
            <button
              key={t.id}
              id={`dashboard-tab-${t.id}`}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-arabic font-medium text-sm transition-all ${
                tab === t.id
                  ? 'bg-gold-500 text-dark-900'
                  : 'bg-dark-700 text-white/60 hover:text-white'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isFetching ? (
          <div className="text-center py-16">
            <div className="book-loader mx-auto mb-4" />
            <p className="font-arabic text-white/50 text-sm">جاري التحميل...</p>
          </div>
        ) : tab === 'stories' ? (
          stories.length === 0 ? (
            <EmptyState
              emoji="📖"
              title="لا توجد قصص بعد"
              desc="ابدأ بإنشاء قصتك السحرية الأولى!"
              cta="ابدأ قصة جديدة ✨"
              to="/create"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {stories.map((story) => {
                const status = statusMap[story.status] || statusMap.draft;
                return (
                  <div key={story._id} className="glass-card glass-card-hover p-5">
                    <div className="text-4xl mb-3">📚</div>
                    <h3 className="font-arabic font-bold text-white text-lg mb-1">
                      قصة {story.childName}
                    </h3>
                    <p className="font-arabic text-white/40 text-xs mb-3">
                      {story.theme} • {new Date(story.createdAt).toLocaleDateString('ar-SA')}
                    </p>
                    <div className={`flex items-center gap-1.5 ${status.color}`}>
                      <status.icon className="w-3.5 h-3.5" />
                      <span className="font-arabic text-xs">{status.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : orders.length === 0 ? (
          <EmptyState
            emoji="📦"
            title="لا توجد طلبات بعد"
            desc="أكمل قصتك وادفع لتظهر طلباتك هنا"
            cta="ابدأ قصة جديدة ✨"
            to="/create"
          />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="glass-card p-5 flex items-center gap-4">
                <div className="text-3xl">📦</div>
                <div className="flex-1">
                  <p className="font-arabic font-bold text-white">
                    طلب رقم: <span className="text-gold-500 font-mono text-sm">{order._id.slice(-8).toUpperCase()}</span>
                  </p>
                  <p className="font-arabic text-white/50 text-xs mt-1">
                    {new Date(order.createdAt).toLocaleDateString('ar-SA')}
                    {' · '}
                    {order.totalPrice} ر.س
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-lg text-xs font-arabic font-bold ${
                  order.paymentStatus === 'paid'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gold-500/20 text-gold-500'
                }`}>
                  {order.paymentStatus === 'paid' ? 'مدفوع ✅' : 'في الانتظار ⏳'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ emoji, title, desc, cta, to }: any) {
  return (
    <div className="text-center py-20 glass-card">
      <div className="text-6xl mb-4">{emoji}</div>
      <h3 className="font-arabic font-bold text-white text-xl mb-2">{title}</h3>
      <p className="font-arabic text-white/50 text-sm mb-6">{desc}</p>
      <Link to={to}>
        <MagicButton size="lg">{cta}</MagicButton>
      </Link>
    </div>
  );
}
