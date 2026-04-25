const fs = require('fs');

const ar = require('./src/locales/ar.json');
const en = require('./src/locales/en.json');
const he = require('./src/locales/he.json');

// Arabic
ar.home.workflow.step1Title = "أدخل تفاصيل طفلك";
ar.home.workflow.step1Desc = "اكتب اسم طفلك وعمره وجنسه لتخصيص القصة";
ar.home.workflow.step2Title = "الذكاء الاصطناعي يكتب القصة";
ar.home.workflow.step2Desc = "يبدع الذكاء الاصطناعي قصة سحرية فريدة بطلها طفلك";
ar.home.workflow.step3Title = "خصّص كتابك";
ar.home.workflow.step3Desc = "اختر ألوان الغلاف وأضف إهداءً شخصياً";
ar.home.workflow.step4Title = "أدخل عنوان الشحن";
ar.home.workflow.step4Desc = "أدخل عنوانك بدقة وسيصلك الكتاب المطبوع خلال أيام";
ar.home.workflow.step5Title = "استلم كتابك المطبوع";
ar.home.workflow.step5Desc = "يصلك كتابك السحري المطبوع بجودة احترافية إلى باب منزلك";
ar.home.workflow.badge = "عملية بسيطة في ٥ خطوات";
ar.home.workflow.subtitle = "من فكرة إلى كتاب مطبوع في يدي طفلك — عملية سهلة وممتعة لا تأخذ أكثر من دقائق";
ar.home.workflow.btn = "✨ ابدأ الآن مجاناً";

// English
en.home.workflow.step1Title = "Enter Child Details";
en.home.workflow.step1Desc = "Enter name, age, and gender to personalize the story";
en.home.workflow.step2Title = "AI Writes the Story";
en.home.workflow.step2Desc = "AI creates a magical unique story with your child as the hero";
en.home.workflow.step3Title = "Customize Your Book";
en.home.workflow.step3Desc = "Choose cover colors and add a personal dedication";
en.home.workflow.step4Title = "Enter Shipping Address";
en.home.workflow.step4Desc = "Enter your address and get the printed book in days";
en.home.workflow.step5Title = "Receive Printed Book";
en.home.workflow.step5Desc = "Get your professional quality printed magic book at your door";
en.home.workflow.badge = "Simple 5-step process";
en.home.workflow.subtitle = "From an idea to a printed book in your child's hands — an easy process that takes minutes";
en.home.workflow.btn = "✨ Start now for free";

// Hebrew
he.home.workflow.step1Title = "הזן פרטי ילד";
he.home.workflow.step1Desc = "הזן שם, גיל ומין כדי להתאים אישית את הסיפור";
he.home.workflow.step2Title = "AI כותב את הסיפור";
he.home.workflow.step2Desc = "הבינה המלאכותית יוצרת סיפור קסום שבו ילדך הוא הגיבור";
he.home.workflow.step3Title = "התאם אישית את הספר";
he.home.workflow.step3Desc = "בחר צבעי כריכה והוסף הקדשה אישית";
he.home.workflow.step4Title = "הזן כתובת משלוח";
he.home.workflow.step4Desc = "הזן כתובת וקבל את הספר המודפס תוך ימים";
he.home.workflow.step5Title = "קבל ספר מודפס";
he.home.workflow.step5Desc = "קבל את הספר הקסום המודפס באיכות מקצועית עד הדלת";
he.home.workflow.badge = "תהליך פשוט ב-5 שלבים";
he.home.workflow.subtitle = "מרעיון לספר מודפס בידי ילדך — תהליך קל שלוקח דקות";
he.home.workflow.btn = "✨ התחל עכשיו בחינם";


fs.writeFileSync('./src/locales/ar.json', JSON.stringify(ar, null, 2));
fs.writeFileSync('./src/locales/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('./src/locales/he.json', JSON.stringify(he, null, 2));
