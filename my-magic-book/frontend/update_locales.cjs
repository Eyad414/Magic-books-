const fs = require('fs');

const ar = require('./src/locales/ar.json');
const en = require('./src/locales/en.json');
const he = require('./src/locales/he.json');

const arPages = {
  home: {
    hero: {
      badge: "مدعوم بالذكاء الاصطناعي ✨",
      title1: "اصنع ",
      titleShimmer: "قصة سحرية",
      title2: "\nمخصصة لطفلك",
      desc: "اصنع كتاب طفلك بشخصية كرتونية بأفضل جودة، وسيكتب الذكاء الاصطناعي قصة مخصصة لك - تُطبع وتُشحن إلى باب منزلك! 🚀📚",
      startBtn: "ابدأ قصتك السحرية",
      browseBtn: "استعرض القصص",
      stat1: "قصة مُنشأة",
      stat2: "عائلة سعيدة",
      stat3: "تقييم متوسط"
    },
    workflow: {
      title: "كيف يعمل؟",
      step1Title: "١. أدخل بيانات طفلك",
      step1Desc: "اسم الطفل، عمره، وجنسه لتبدأ السحر.",
      step2Title: "٢. اختر موضوع القصة",
      step2Desc: "من الفضاء للغابات، اختر المغامرة المناسبة.",
      step3Title: "٣. استلم كتابك المطبوع",
      step3Desc: "سنقوم بطباعته بأعلى جودة وتوصيله لباب بيتك."
    },
    bestsellers: {
      title: "أكثر القصص ",
      titleShimmer: "مبيعاً",
      btn: "تصفح جميع القصص"
    },
    faq: {
      title: "الأسئلة ",
      titleShimmer: "الشائعة",
      q1: "كيف أبني هذا الكتاب؟",
      a1: "عن طريق واجهتنا السهلة، أدخل تفاصيل طفلك واختر موضوع القصة، وسيقوم الذكاء الاصطناعي بباقي العمل بلمح البصر!",
      q2: "كم يستغرق صنع وتوصيل الكتاب؟",
      a2: "توليد القصة فوري، وبمجرد اعتمادك للطلب، يتم طباعة الكتاب وإيصاله إليك خلال ٣ إلى ٤ أيام عمل.",
      q3: "هل الكتاب مناسب لجميع الأعمار؟",
      a3: "نعم! نحن نخصص لغة القصة وأسلوبها لتناسب الفئة العمرية التي تختارها بدقة تامة.",
      q4: "هل يمكنني رؤية القصة قبل الشراء؟",
      a4: "بالتأكيد! يمكنك قراءة أول ٣٠٪ من القصة ومعاينة الغلاف مجاناً قبل الدفع والتأكيد."
    },
    scroll: "اكتشف المزيد",
    cta: {
      title: "جاهز لصنع قصة لا تُنسى؟",
      desc: "انضم لمئات العائلات السعيدة واصنع ذكرى تعيش مع طفلك إلى الأبد",
      btn: "✨ ابدأ قصتك الآن"
    }
  },
  stories: {
    title: "مكتبة القصص ",
    titleShimmer: "السحرية",
    desc: "استكشف مجموعة من القصص المخصصة التي صنعناها مسبقاً، واستلهم منها لقصة طفلك القادمة.",
    filters: {
      all: "الكل",
      adventure: "مغامرات",
      space: "فضاء",
      ocean: "محيط",
      forest: "غابة",
      princess: "أميرات",
      superhero: "أبطال",
      animals: "حيوانات"
    },
    readNow: "اقرأ الآن",
    createLikeThis: "اصنع قصة مشابهة ✨"
  },
  contact: {
    title: "يسعدنا ",
    titleShimmer: "تواصلك معنا",
    desc: "نحن هنا لمساعدتك والإجابة على جميع استفساراتك. لا تتردد في مراسلتنا!",
    supportTitle: "دعم فني متميز",
    supportDesc: "فريقنا متواجد للرد عليك خلال ٢٤ ساعة.",
    emailLabel: "راسلنا على:",
    callLabel: "اتصل بنا:",
    workHoursLabel: "ساعات العمل:",
    workHours: "من الأحد للخميس (٩ ص - ٥ م)",
    formTitle: "أرسل لنا رسالة ✉️",
    nameLabel: "الاسم الكريم",
    namePlaceholder: "اكتب اسمك هنا",
    emailLabelForm: "البريد الإلكتروني",
    emailPlaceholder: "example@email.com",
    msgLabel: "كيف يمكننا مساعدتك؟",
    msgPlaceholder: "اكتب رسالتك هنا...",
    submitBtn: "إرسال الرسالة",
    sendingBtn: "جاري الإرسال...",
    successMsg: "تم إرسال رسالتك بنجاح! سنرد عليك في أقرب وقت. 📩"
  },
  about: {
    title: "نؤمن بأن كل طفل ",
    titleShimmer: "يستحق قصة بطولته",
    desc: "كتابي السحري هو منصة عربية رائدة تجمع بين الذكاء الاصطناعي وحب الأطفال لصنع قصص مطبوعة تُبقى معهم إلى الأبد",
    rating: "تقييم ٥/٥ من أكثر من ١٠٠ عائلة",
    stats: {
      generated: "قصة مُنشأة",
      families: "عائلة سعيدة",
      themes: "موضوع قصة",
      langs: "لغات متاحة"
    },
    missionTitle: "مهمتنا",
    missionDesc: "نهدف إلى جعل القراءة تجربة سحرية ومخصصة لكل طفل عربي. نؤمن بأن الطفل الذي يرى نفسه بطلاً في قصة يُصبح قارئاً شغوفاً مدى الحياة.",
    valuesTitle: "قيمنا وما نؤمن به",
    values: {
      passion: "الشغف بالأطفال",
      passionDesc: "كل قصة نصنعها بحب حقيقي للأطفال وإيمان بقيمة القراءة",
      quality: "الجودة أولاً",
      qualityDesc: "نستخدم أفضل تقنيات الذكاء الاصطناعي لضمان قصص عالية الجودة",
      culture: "ثقافة عربية",
      cultureDesc: "نفخر بتقديم محتوى عربي أصيل يعزز هوية أطفالنا",
      custom: "تخصيص كامل",
      customDesc: "كل كتاب مختلف تماماً — مخصص بشكل فريد لطفلك",
      speed: "سرعة الطباعة",
      speedDesc: "نعمل بأقصى سرعة لطباعة قصتك وتوصيلها حتى باب منزلك خلال أيام معدودة",
      langs: "لغات متعددة",
      langsDesc: "ندعم أكثر من لغة (العربية، الإنجليزية، والعبرية) لتلائم تنوع وثقافة جميع العائلات"
    },
    teamTitle: "فريقنا ",
    teamShimmer: "المبدع",
    teamRoles: {
      ceo: "المؤسس والمدير التنفيذي",
      ceoDesc: "متخصص في تقنيات الذكاء الاصطناعي وإبداع المحتوى",
      director: "مديرة القصص الإبداعية",
      directorDesc: "كاتبة قصص أطفال بخبرة ١٠ سنوات",
      dev: "مطور التطبيق",
      devDesc: "مطور برمجيات متخصص في تطبيقات الويب"
    },
    ctaTitle: "هل أنت مستعد؟",
    ctaDesc: "ابدأ اليوم وامنح طفلك تجربة لا تُنسى",
    ctaBtn: "✨ ابدأ قصتك السحرية"
  }
};

const enPages = {
  home: {
    hero: {
      badge: "AI Powered ✨",
      title1: "Create a ",
      titleShimmer: "Magical Story",
      title2: "\nPersonalized for your child",
      desc: "Create a custom book with a cartoon character of your child in high quality. AI will write a story for you - printed and shipped to your door! 🚀📚",
      startBtn: "Start Your Magical Story",
      browseBtn: "Browse Stories",
      stat1: "Stories Created",
      stat2: "Happy Families",
      stat3: "Average Rating"
    },
    workflow: {
      title: "How It Works?",
      step1Title: "1. Enter Child Details",
      step1Desc: "Name, age, and gender to start the magic.",
      step2Title: "2. Choose a Theme",
      step2Desc: "From space to forests, pick the right adventure.",
      step3Title: "3. Receive Printed Book",
      step3Desc: "Printed in high quality and delivered to your door."
    },
    bestsellers: {
      title: "Best ",
      titleShimmer: "Sellers",
      btn: "Browse All Stories"
    },
    faq: {
      title: "Frequently Asked ",
      titleShimmer: "Questions",
      q1: "How do I build this book?",
      a1: "Through our easy interface, enter your child's details and choose a theme, and AI will do the rest in seconds!",
      q2: "How long does it take?",
      a2: "Generation is instant. Once approved, the book is printed and delivered in 3-4 business days.",
      q3: "Is it suitable for all ages?",
      a3: "Yes! We precisely tailor the language and style to suit your chosen age group.",
      q4: "Can I preview it before buying?",
      a4: "Absolutely! You can read the first 30% and preview the cover for free before checking out."
    },
    scroll: "Discover More",
    cta: {
      title: "Ready to create an unforgettable story?",
      desc: "Join hundreds of happy families and create a memory that lives with your child forever",
      btn: "✨ Start your story now"
    }
  },
  stories: {
    title: "Magical Stories ",
    titleShimmer: "Library",
    desc: "Explore a collection of custom stories we've created, and get inspired for your next one.",
    filters: {
      all: "All",
      adventure: "Adventures",
      space: "Space",
      ocean: "Ocean",
      forest: "Forest",
      princess: "Princess",
      superhero: "Superheroes",
      animals: "Animals"
    },
    readNow: "Read Now",
    createLikeThis: "Create similar story ✨"
  },
  contact: {
    title: "We'd love to ",
    titleShimmer: "hear from you",
    desc: "We are here to help and answer all your questions. Feel free to contact us!",
    supportTitle: "Premium Support",
    supportDesc: "Our team is available to respond within 24 hours.",
    emailLabel: "Email us at:",
    callLabel: "Call us:",
    workHoursLabel: "Working Hours:",
    workHours: "Sun to Thu (9 AM - 5 PM)",
    formTitle: "Send us a message ✉️",
    nameLabel: "Your Name",
    namePlaceholder: "Enter your name",
    emailLabelForm: "Email Address",
    emailPlaceholder: "example@email.com",
    msgLabel: "How can we help?",
    msgPlaceholder: "Write your message here...",
    submitBtn: "Send Message",
    sendingBtn: "Sending...",
    successMsg: "Message sent successfully! We'll reply soon. 📩"
  },
  about: {
    title: "We believe every child ",
    titleShimmer: "deserves to be a hero",
    desc: "My Magic Book is a leading platform combining AI and a love for children to create printed stories that last forever.",
    rating: "Rated 5/5 by over 100 families",
    stats: {
      generated: "Stories Created",
      families: "Happy Families",
      themes: "Story Themes",
      langs: "Languages Available"
    },
    missionTitle: "Our Mission",
    missionDesc: "We aim to make reading a magical and personalized experience for every child. A child who sees themselves as a hero becomes a lifelong reader.",
    valuesTitle: "Our Values",
    values: {
      passion: "Passion for Children",
      passionDesc: "Every story is made with true love and belief in reading.",
      quality: "Quality First",
      qualityDesc: "We use top AI technologies for high-quality stories.",
      culture: "Cultural Identity",
      cultureDesc: "We proudly present content that enhances our identity.",
      custom: "Fully Custom",
      customDesc: "Every book is completely different and unique.",
      speed: "Fast Printing",
      speedDesc: "We work fast to print and deliver in just a few days.",
      langs: "Multiple Languages",
      langsDesc: "We support multiple languages to suit diverse families."
    },
    teamTitle: "Our Creative ",
    teamShimmer: "Team",
    teamRoles: {
      ceo: "Founder & CEO",
      ceoDesc: "Specialist in AI technologies and content creation.",
      director: "Creative Story Director",
      directorDesc: "Children's author with 10 years experience.",
      dev: "App Developer",
      devDesc: "Software developer specializing in web apps."
    },
    ctaTitle: "Are you ready?",
    ctaDesc: "Start today and give your child an unforgettable experience.",
    ctaBtn: "✨ Start Your Magical Story"
  }
};

const hePages = {
  home: {
    hero: {
      badge: "מופעל באמצעות בינה מלאכותית ✨",
      title1: "צור ",
      titleShimmer: "סיפור קסום",
      title2: "\nמותאם אישית לילדך",
      desc: "צרו ספר עם דמות מצוירת של ילדכם באיכות הטובה ביותר. בינה מלאכותית תכתוב סיפור עבורכם - מודפס ונשלח עד הבית! 🚀📚",
      startBtn: "התחל את הסיפור הקסום",
      browseBtn: "עיין בסיפורים",
      stat1: "סיפורים נוצרו",
      stat2: "משפחות שמחות",
      stat3: "דירוג ממוצע"
    },
    workflow: {
      title: "איך זה עובד?",
      step1Title: "1. הזן פרטי הילד",
      step1Desc: "שם, גיל ומין כדי להתחיל את הקסם.",
      step2Title: "2. בחר נושא",
      step2Desc: "מהחלל ליערות, בחרו את ההרפתקה המתאימה.",
      step3Title: "3. קבלו את הספר",
      step3Desc: "מודפס באיכות גבוהה ונמסר עד הדלת."
    },
    bestsellers: {
      title: "הנמכרים ",
      titleShimmer: "ביותר",
      btn: "עיין בכל הסיפורים"
    },
    faq: {
      title: "שאלות ",
      titleShimmer: "נפוצות",
      q1: "איך אני יוצר את הספר הזה?",
      a1: "דרך הממשק הקל שלנו, הזינו את פרטי הילד ובחרו נושא, והבינה המלאכותית תעשה את השאר!",
      q2: "כמה זמן זה לוקח?",
      a2: "היצירה היא מיידית. לאחר אישור, הספר מודפס ונשלח תוך 3-4 ימי עסקים.",
      q3: "האם זה מתאים לכל הגילאים?",
      a3: "כן! אנו מתאימים במדויק את השפה והסגנון לקבוצת הגיל שתבחרו.",
      q4: "האם ניתן לראות לפני הרכישה?",
      a4: "בהחלט! תוכלו לקרוא את ה-30% הראשונים ולראות את הכריכה בחינם לפני התשלום."
    },
    scroll: "גלה עוד",
    cta: {
      title: "מוכן ליצור סיפור בלתי נשכח?",
      desc: "הצטרף למאות משפחות מאושרות וצור זיכרון שיישאר עם ילדך לנצח",
      btn: "✨ התחל את הסיפור שלך עכשיו"
    }
  },
  stories: {
    title: "ספריית סיפורים ",
    titleShimmer: "קסומה",
    desc: "חקרו אוסף של סיפורים מותאמים אישית שיצרנו, וקבלו השראה לסיפור הבא.",
    filters: {
      all: "הכל",
      adventure: "הרפתקאות",
      space: "חלל",
      ocean: "אוקיינוס",
      forest: "יער",
      princess: "נסיכות",
      superhero: "גיבורי על",
      animals: "חיות"
    },
    readNow: "קרא עכשיו",
    createLikeThis: "צור סיפור דומה ✨"
  },
  contact: {
    title: "נשמח ",
    titleShimmer: "לשמוע ממך",
    desc: "אנחנו כאן לעזור ולענות על כל שאלותיכם. אל תהססו לפנות אלינו!",
    supportTitle: "תמיכה מעולה",
    supportDesc: "הצוות שלנו זמין לענות תוך 24 שעות.",
    emailLabel: "כתבו לנו:",
    callLabel: "התקשרו אלינו:",
    workHoursLabel: "שעות פעילות:",
    workHours: "ראשון עד חמישי (9:00 - 17:00)",
    formTitle: "שלח לנו הודעה ✉️",
    nameLabel: "שם",
    namePlaceholder: "הכנס את שמך",
    emailLabelForm: "דוא\"ל",
    emailPlaceholder: "example@email.com",
    msgLabel: "איך נוכל לעזור?",
    msgPlaceholder: "כתוב את הודעתך כאן...",
    submitBtn: "שלח הודעה",
    sendingBtn: "שולח...",
    successMsg: "הודעתך נשלחה בהצלחה! נחזור אליך בקרוב. 📩"
  },
  about: {
    title: "אנו מאמינים שכל ילד ",
    titleShimmer: "ראוי להיות גיבור",
    desc: "הספר הקסום שלי הוא פלטפורמה המשלבת בינה מלאכותית ואהבה לילדים ליצירת סיפורים מודפסים שיישארו איתם לתמיד.",
    rating: "דירוג 5/5 מעל 100 משפחות",
    stats: {
      generated: "סיפורים נוצרו",
      families: "משפחות שמחות",
      themes: "נושאי סיפור",
      langs: "שפות נתמכות"
    },
    missionTitle: "המשימה שלנו",
    missionDesc: "אנו שואפים להפוך את הקריאה לחוויה קסומה. ילד שרואה עצמו כגיבור בסיפור הופך לקורא נלהב לכל החיים.",
    valuesTitle: "הערכים שלנו",
    values: {
      passion: "תשוקה לילדים",
      passionDesc: "כל סיפור נוצר באהבה אמיתית ואמונה בערך הקריאה.",
      quality: "איכות מעל הכל",
      qualityDesc: "אנו משתמשים בטכנולוגיות המתקדמות ביותר להבטחת איכות.",
      culture: "זהות תרבותית",
      cultureDesc: "אנו גאים להציג תוכן אותנטי המחזק את זהותנו.",
      custom: "התאמה אישית מלאה",
      customDesc: "כל ספר שונה לחלוטין - מותאם במיוחד לילדך.",
      speed: "הדפסה מהירה",
      speedDesc: "אנו עובדים מהר כדי להדפיס ולספק תוך מספר ימים.",
      langs: "מרובה שפות",
      langsDesc: "תמיכה במספר שפות להתאמה למגוון רחב של משפחות."
    },
    teamTitle: "הצוות ",
    teamShimmer: "היצירתי שלנו",
    teamRoles: {
      ceo: "מייסד ומנכ\"ל",
      ceoDesc: "מומחה בטכנולוגיות בינה מלאכותית ויצירת תוכן.",
      director: "מנהלת סיפורים",
      directorDesc: "סופרת ילדים עם 10 שנות ניסיון.",
      dev: "מפתח יישומים",
      devDesc: "מפתח תוכנה המתמחה ביישומי אינטרנט."
    },
    ctaTitle: "האם אתה מוכן?",
    ctaDesc: "התחל היום והענק לילדך חוויה בלתי נשכחת.",
    ctaBtn: "✨ התחל את הסיפור הקסום"
  }
};

ar.home = arPages.home;
ar.stories = arPages.stories;
ar.contact = arPages.contact;
ar.about = arPages.about;

en.home = enPages.home;
en.stories = enPages.stories;
en.contact = enPages.contact;
en.about = enPages.about;

he.home = hePages.home;
he.stories = hePages.stories;
he.contact = hePages.contact;
he.about = hePages.about;

fs.writeFileSync('./src/locales/ar.json', JSON.stringify(ar, null, 2));
fs.writeFileSync('./src/locales/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('./src/locales/he.json', JSON.stringify(he, null, 2));
console.log('Done updating locales.');
