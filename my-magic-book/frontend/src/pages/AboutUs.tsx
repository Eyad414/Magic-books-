import { Star, BookOpen, Heart, Award, Globe, Zap, Languages } from 'lucide-react';
import { Link } from 'react-router-dom';

const team = [
  { name: 'أحمد العمر', role: 'المؤسس والمدير التنفيذي', emoji: '👨‍💼', desc: 'متخصص في تقنيات الذكاء الاصطناعي وإبداع المحتوى' },
  { name: 'سارة المطيري', role: 'مديرة القصص الإبداعية', emoji: '👩‍🎨', desc: 'كاتبة قصص أطفال بخبرة ١٠ سنوات' },
  { name: 'خالد الزهراني', role: 'مطور التطبيق', emoji: '👨‍💻', desc: 'مطور برمجيات متخصص في تطبيقات الويب' },
];

const values = [
  { icon: Heart, title: 'الشغف بالأطفال', desc: 'كل قصة نصنعها بحب حقيقي للأطفال وإيمان بقيمة القراءة' },
  { icon: Star, title: 'الجودة أولاً', desc: 'نستخدم أفضل تقنيات الذكاء الاصطناعي لضمان قصص عالية الجودة' },
  { icon: Globe, title: 'ثقافة عربية', desc: 'نفخر بتقديم محتوى عربي أصيل يعزز هوية أطفالنا' },
  { icon: Award, title: 'تخصيص كامل', desc: 'كل كتاب مختلف تماماً — مخصص بشكل فريد لطفلك' },
  { icon: Zap, title: 'سرعة الطباعة', desc: 'نعمل بأقصى سرعة لطباعة قصتك وتوصيلها حتى باب منزلك خلال أيام معدودة' },
  { icon: Languages, title: 'لغات متعددة', desc: 'ندعم أكثر من لغة (العربية، الإنجليزية، والعبرية) لتلائم تنوع وثقافة جميع العائلات' },
];

export default function AboutUs() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-6xl mb-6">📚✨</div>
          <h1 className="font-arabic font-black text-white mb-6">
            نؤمن بأن كل طفل <span className="shimmer-text">يستحق قصة بطولته</span>
          </h1>
          <p className="font-arabic text-white/60 text-xl leading-relaxed mb-8">
            كتابي السحري هو منصة عربية رائدة تجمع بين الذكاء الاصطناعي وحب الأطفال لصنع قصص مطبوعة تُبقى معهم إلى الأبد
          </p>
          <div className="flex items-center justify-center gap-1 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-6 h-6 text-gold-500 fill-gold-500" />
            ))}
            <span className="font-arabic text-white/60 mr-2 text-sm">تقييم ٥/٥ من أكثر من ١٠٠ عائلة</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { value: '+٥٠٠', label: 'قصة مُنشأة', emoji: '📖' },
            { value: '+١٠٠', label: 'عائلة سعيدة', emoji: '👨‍👩‍👧‍👦' },
            { value: '١٢', label: 'موضوع قصة', emoji: '🌟' },
            { value: '٣', label: 'لغات متاحة', emoji: '🌍' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-6 text-center">
              <div className="text-3xl mb-2">{stat.emoji}</div>
              <div className="font-arabic font-black text-gold-500 text-3xl">{stat.value}</div>
              <div className="font-arabic text-white/50 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-3xl mx-auto glass-card p-10 text-center">
          <BookOpen className="w-12 h-12 text-gold-500 mx-auto mb-4" />
          <h2 className="font-arabic font-bold text-white text-2xl mb-4">مهمتنا</h2>
          <p className="font-arabic text-white/60 text-lg leading-relaxed">
            نهدف إلى جعل القراءة تجربة سحرية ومخصصة لكل طفل عربي. نؤمن بأن الطفل الذي يرى نفسه بطلاً في قصة يُصبح قارئاً شغوفاً مدى الحياة.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-arabic font-bold text-white text-3xl text-center mb-10">
            قيمنا وما نؤمن به
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((v) => (
              <div key={v.title} className="glass-card glass-card-hover p-6 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                  <v.icon className="w-6 h-6 text-gold-500" />
                </div>
                <div>
                  <h3 className="font-arabic font-bold text-white text-lg mb-2">{v.title}</h3>
                  <p className="font-arabic text-white/50 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-arabic font-bold text-white text-3xl text-center mb-10">
            فريقنا <span className="shimmer-text">المبدع</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {team.map((member) => (
              <div key={member.name} className="glass-card glass-card-hover p-6 text-center">
                <div className="text-5xl mb-4">{member.emoji}</div>
                <h3 className="font-arabic font-bold text-white text-lg mb-1">{member.name}</h3>
                <p className="font-arabic text-gold-500 text-sm mb-3">{member.role}</p>
                <p className="font-arabic text-white/50 text-xs leading-relaxed">{member.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-xl mx-auto glass-card p-10">
          <h2 className="font-arabic font-bold text-white text-2xl mb-4">هل أنت مستعد؟</h2>
          <p className="font-arabic text-white/50 mb-6">ابدأ اليوم وامنح طفلك تجربة لا تُنسى</p>
          <Link to="/create">
            <button className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-lg transition-all hover:shadow-gold-glow hover:-translate-y-1">
              ✨ ابدأ قصتك السحرية
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
