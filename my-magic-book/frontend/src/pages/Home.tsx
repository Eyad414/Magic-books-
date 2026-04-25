import HeroSection from '../components/home/HeroSection';
import WorkFlow from '../components/home/WorkFlow';
import BestSellers from '../components/home/BestSellers';

// FAQ section
function FAQ() {
  const faqs = [
    { q: 'كيف أبني هذا الكتاب؟', a: 'عن طريق واجهتنا السهلة، أدخل تفاصيل طفلك واختر موضوع القصة، وسيقوم الذكاء الاصطناعي بباقي العمل بلمح البصر!' },
    { q: 'كم يستغرق صنع وتوصيل الكتاب؟', a: 'توليد القصة فوري، وبمجرد اعتمادك للطلب، يتم طباعة الكتاب وإيصاله إليك خلال ٣ إلى ٤ أيام عمل.' },
    { q: 'هل الكتاب مناسب لجميع الأعمار؟', a: 'نعم! نحن نخصص لغة القصة وأسلوبها لتناسب الفئة العمرية التي تختارها بدقة تامة.' },
    { q: 'هل يمكنني رؤية القصة قبل الشراء؟', a: 'بالتأكيد! يمكنك قراءة أول ٣٠٪ من القصة ومعاينة الغلاف مجاناً قبل الدفع والتأكيد.' },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-700/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-arabic font-black text-white">
            الأسئلة <span className="shimmer-text">الشائعة</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, i) => (
            <div key={i} className="glass-card p-6">
              <h3 className="font-arabic font-bold text-white text-lg mb-3 flex items-start gap-2">
                <span className="text-gold-500">❓</span> {faq.q}
              </h3>
              <p className="font-arabic text-white/70 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScrollIndicator() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-white/30 animate-bounce-slow py-4">
      <span className="font-arabic text-xs">اكتشف المزيد</span>
      <div className="w-0.5 h-10 bg-gradient-to-b from-gold-500/50 to-transparent" />
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <HeroSection />
      
      <WorkFlow />
      <ScrollIndicator />
      
      <BestSellers />
      <ScrollIndicator />
      
      <FAQ />
      <ScrollIndicator />

      {/* Final CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto glass-card p-12">
          <div className="text-5xl mb-6">📚✨</div>
          <h2 className="font-arabic font-black text-white mb-4">
            جاهز لصنع قصة لا تُنسى؟
          </h2>
          <p className="font-arabic text-white/50 mb-8">
            انضم لمئات العائلات السعيدة واصنع ذكرى تعيش مع طفلك إلى الأبد
          </p>
          <a
            href="/create"
            id="home-final-cta"
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-xl transition-all duration-300 hover:shadow-gold-glow hover:-translate-y-1"
          >
            ✨ ابدأ قصتك الآن
          </a>
        </div>
      </section>
    </div>
  );
}
