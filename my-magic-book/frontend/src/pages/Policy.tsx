import { Link } from 'react-router-dom';
import { Lock, Eye, Shield, FileText } from 'lucide-react';

const Section = ({ id, icon: Icon, title, children }: any) => (
  <section id={id} className="mb-10">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-gold-500" />
      </div>
      <h2 className="font-arabic font-bold text-white text-xl">{title}</h2>
    </div>
    <div className="glass-card p-6">
      <div className="font-arabic text-white/60 text-sm leading-relaxed space-y-3">{children}</div>
    </div>
  </section>
);

export default function Policy() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-arabic font-black text-white mb-4">
            <span className="shimmer-text">السياسات والشروط</span>
          </h1>
          <p className="font-arabic text-white/50">آخر تحديث: إبريل ٢٠٢٦</p>
        </div>

        <Section id="privacy" icon={Lock} title="سياسة الخصوصية">
          <p>نحن في كتابي السحري نأخذ خصوصيتك بجدية بالغة. نلتزم بحماية بياناتك الشخصية وعدم مشاركتها مع أي طرف ثالث دون موافقتك الصريحة.</p>
          <p><strong className="text-white">البيانات التي نجمعها:</strong> الاسم، البريد الإلكتروني، عنوان الشحن، ومعلومات طفلك (الاسم والعمر) لغرض إنشاء القصة فقط.</p>
          <p><strong className="text-white">أمان البيانات:</strong> جميع البيانات مشفرة باستخدام بروتوكول HTTPS وتُخزّن في خوادم آمنة.</p>
          <p><strong className="text-white">بيانات الأطفال:</strong> نلتزم بحماية خاصة لبيانات الأطفال ولا نستخدمها سوى لإنشاء القصة المخصصة.</p>
        </Section>

        <Section id="terms" icon={FileText} title="شروط الاستخدام">
          <p><strong className="text-white">الاستخدام المسموح:</strong> يُسمح باستخدام المنصة للأغراض الشخصية والعائلية فقط.</p>
          <p><strong className="text-white">الملكية الفكرية:</strong> القصص المُولّدة هي ملك للمستخدم بعد الدفع الكامل. نحتفظ بحق استخدام بيانات مجهولة لتحسين النموذج.</p>
          <p><strong className="text-white">المحتوى:</strong> يُحظر استخدام المنصة لإنشاء محتوى مسيء أو غير لائق للأطفال.</p>
          <p><strong className="text-white">التسعير:</strong> الأسعار بالشيكل الإسرائيلي (₪) وتشمل ضريبة القيمة المضافة. نحتفظ بحق تغيير الأسعار مع إخطار مسبق.</p>
        </Section>

        <Section id="refund" icon={Eye} title="سياسة الاسترداد">
          <p>نعمل وفقًا لقانون حماية المستهلك الإسرائيلي لسنة 1981 ولأنظمة حماية المستهلك (إلغاء الصفقة) لسنة 2010.</p>
          <p><strong className="text-white">المنتجات المخصصة:</strong> لذلك، ووفقًا للقانون، لا يمكن إلغاء الطلب أو استرجاع المبلغ بعد بدء عملية الإنتاج، لأن الكتاب مخصص ومطبوع خصيصاً لك.</p>
          <p><strong className="text-white">تلف أو خطأ:</strong> نضمن استبدال الكتاب مجاناً إذا وصل تالفاً أو كان هناك خطأ في المحتوى من طرفنا.</p>
          <p>للاستفسارات والشكاوى: راسلنا على <a href="mailto:refund@mymagicbook.sa" className="text-gold-500 hover:underline">refund@mymagicbook.sa</a></p>
        </Section>

        <Section id="shipping" icon={Shield} title="سياسة الشحن">
          <p><strong className="text-white">التوصيل:</strong> نشحن حالياً لجميع المناطق المدعومة.</p>
          <p><strong className="text-white">مدة الشحن:</strong> ٣-٥ أيام عمل من تاريخ تأكيد الدفع.</p>
          <p><strong className="text-white">التتبع:</strong> ستصلك رسالة برقم تتبع شحنتك فور إرسال الكتاب.</p>
        </Section>

        <Section id="payment" icon={Shield} title="سياسة الدفع">
          <p><strong className="text-white">طرق الدفع:</strong> نقبل الدفع عبر البطاقات الائتمانية وبوابات الدفع الإلكترونية المعتمدة والمشفرة بالكامل.</p>
          <p><strong className="text-white">الأمان:</strong> لا نقوم بتخزين بيانات بطاقتك الائتمانية في خوادمنا؛ تتم جميع المعاملات عبر مزودي خدمة دفع آمنين ومعتمدين.</p>
        </Section>

        <Section id="data-deletion" icon={Lock} title="سياسة حذف البيانات">
          <p><strong className="text-white">حقوقك:</strong> يحق لك في أي وقت طلب حذف حسابك وكافة بياناتك أو بيانات طفلك من خوادمنا.</p>
          <p><strong className="text-white">طريقة الطلب:</strong> يمكنك إرسال طلب حذف البيانات عبر البريد الإلكتروني أو من خلال صفحة "تواصل معنا"، وسيتم معالجة الطلب ومسح البيانات نهائياً خلال ١٤ يوم عمل كحد أقصى.</p>
        </Section>

        <div className="text-center mt-10">
          <p className="font-arabic text-white/30 text-sm mb-4">هل لديك أسئلة حول سياساتنا؟</p>
          <Link to="/contact" className="font-arabic text-gold-500 hover:underline text-sm">
            تواصل مع فريق الدعم ←
          </Link>
        </div>
      </div>
    </div>
  );
}
