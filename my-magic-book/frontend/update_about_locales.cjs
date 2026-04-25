const fs = require('fs');

const ar = require('./src/locales/ar.json');
const en = require('./src/locales/en.json');
const he = require('./src/locales/he.json');

// Arabic
ar.about.team = [
  { name: 'أحمد العمر', role: 'المؤسس والمدير التنفيذي', desc: 'متخصص في تقنيات الذكاء الاصطناعي وإبداع المحتوى' },
  { name: 'سارة المطيري', role: 'مديرة القصص الإبداعية', desc: 'كاتبة قصص أطفال بخبرة ١٠ سنوات' },
  { name: 'خالد الزهراني', role: 'مطور التطبيق', desc: 'مطور برمجيات متخصص في تطبيقات الويب' }
];

// English
en.about.team = [
  { name: 'Ahmed Alomar', role: 'Founder and CEO', desc: 'Specialist in AI technologies and content creation' },
  { name: 'Sarah Almutairi', role: 'Creative Story Director', desc: 'Children\'s stories author with 10 years experience' },
  { name: 'Khaled Alzahrani', role: 'App Developer', desc: 'Software developer specialized in web applications' }
];

// Hebrew
he.about.team = [
  { name: 'אחמד אלעומר', role: 'מייסד ומנכ"ל', desc: 'מומחה בטכנולוגיות בינה מלאכותית ויצירת תוכן' },
  { name: 'שרה אלמוטירי', role: 'מנהלת סיפורים קריאייטיב', desc: 'סופרת סיפורי ילדים בעלת ניסיון של 10 שנים' },
  { name: 'חאלד אלזהראני', role: 'מפתח אפליקציות', desc: 'מפתח תוכנה מתמחה ביישומי אינטרנט' }
];

fs.writeFileSync('./src/locales/ar.json', JSON.stringify(ar, null, 2));
fs.writeFileSync('./src/locales/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('./src/locales/he.json', JSON.stringify(he, null, 2));
console.log("Updated about locales.");
