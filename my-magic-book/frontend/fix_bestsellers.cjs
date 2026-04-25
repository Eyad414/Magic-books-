const fs = require('fs');

const ar = require('./src/locales/ar.json');
const en = require('./src/locales/en.json');
const he = require('./src/locales/he.json');

// Arabic
ar.home.bestsellers.badge = "الأكثر طلباً";
ar.home.bestsellers.title1 = "قصص ";
ar.home.bestsellers.titleShimmer = "يحبها الأطفال";
ar.home.bestsellers.browseAll = "عرض الكل ←";
ar.home.bestsellers.createCustom = "اطلب مخصصاً ✨";

ar.home.bestsellers.items = {
  space: { title: "بطل الفضاء", desc: "رحلة مثيرة في أعماق الكون بحثاً عن نجم ضائع", tag: "الأكثر مبيعاً" },
  forest: { title: "أميرة الغابة", desc: "مغامرة ساحرة في غابة سرية مليئة بالحيوانات الناطقة", tag: "جديد" },
  superhero: { title: "البطل الخارق", desc: "يكتشف طفلك قوى خارقة ويصبح منقذ المدينة", tag: "مميز" },
  ocean: { title: "مغامرة المحيط", desc: "رحلة تحت الماء مع أصدقاء البحر الودودين", tag: "" }
};

// English
en.home.bestsellers.badge = "Top Requested";
en.home.bestsellers.title1 = "Stories ";
en.home.bestsellers.titleShimmer = "Children Love";
en.home.bestsellers.browseAll = "View All ←";
en.home.bestsellers.createCustom = "Order Custom ✨";

en.home.bestsellers.items = {
  space: { title: "Space Hero", desc: "An exciting journey deep into the universe looking for a lost star", tag: "Best Seller" },
  forest: { title: "Princess of the Forest", desc: "A magical adventure in a secret forest full of talking animals", tag: "New" },
  superhero: { title: "The Superhero", desc: "Your child discovers superpowers and saves the city", tag: "Featured" },
  ocean: { title: "Ocean Adventure", desc: "Underwater journey with friendly sea friends", tag: "" }
};

// Hebrew
he.home.bestsellers.badge = "הכי מבוקשים";
he.home.bestsellers.title1 = "סיפורים ";
he.home.bestsellers.titleShimmer = "שילדים אוהבים";
he.home.bestsellers.browseAll = "צפה בהכל ←";
he.home.bestsellers.createCustom = "הזמן מותאם אישית ✨";

he.home.bestsellers.items = {
  space: { title: "גיבור חלל", desc: "מסע מרתק בעומק היקום בחיפוש אחר כוכב אבוד", tag: "רב מכר" },
  forest: { title: "נסיכת היער", desc: "הרפתקה קסומה ביער סודי מלא בחיות מדברות", tag: "חדש" },
  superhero: { title: "גיבור על", desc: "ילדך מגלה כוחות על ומציל את העיר", tag: "מומלץ" },
  ocean: { title: "הרפתקה באוקיינוס", desc: "מסע תת ימי עם חברי ים ידידותיים", tag: "" }
};

fs.writeFileSync('./src/locales/ar.json', JSON.stringify(ar, null, 2));
fs.writeFileSync('./src/locales/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('./src/locales/he.json', JSON.stringify(he, null, 2));
