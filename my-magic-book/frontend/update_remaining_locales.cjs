const fs = require('fs');

const ar = require('./src/locales/ar.json');
const en = require('./src/locales/en.json');
const he = require('./src/locales/he.json');

const arAdditional = {
  stories: {
    ...ar.stories,
    lockNotice: {
      title: "نظام المعاينة:",
      desc: "يمكن مشاهدة ٣٠٪ من كل قصة مجاناً — باقي القصة يُكشف بعد طلب كتابك المخصص",
      available: "٣٠٪ مُتاح",
      locked: "٧٠٪ مقفل",
      complete: "يكتمل بالطلب"
    },
    storyPreview: {
      storyOf: "قصة",
      theme: "موضوع:",
      continued: "وتتواصل القصة في مغامرة مثيرة مليئة بالمفاجآت والدروس...",
      cta: "✨ ابدأ بصنع قصتك الآن"
    },
    catchy: {
      moreStories: "قصص أكثر 📚",
      moreMemories: "ذكريات أكثر",
      moreHappiness: "سعادة أكبر ✨"
    },
    bottomCta: {
      title: "هل تريد قصة تحمل اسم طفلك؟",
      desc: "أنشئ قصة مخصصة بالكامل لطفلك — اسمه هو البطل، موضوعه هو الحكاية",
      btn: "✨ ابدأ بصنع قصتك الآن"
    },
    modal: {
      title: "معاينة قصة",
      notice: "هذا العرض يوضح ٣٠٪ فقط من القصة المخصصة",
      btn: "✨ ابدأ بصنع نسختك الكاملة",
      filler: "فجأة، تغير كل شيء أمام أعينهم وبدأت رحلة جديدة مليئة بالتحديات التي تحتاج إلى شجاعة وذكاء. هل سيتمكنون من الوصول إلى هدفهم؟"
    },
    samples: [
      { childName: 'محمد', preview: 'في صحراء لا حدود لها، انطلق محمد بشجاعة لم يعرفها أحد من قبل. كان قلبه يدق بسرعة وعيناه تلمعان بفضول المستكشف...' },
      { childName: 'سارة', preview: 'في مملكة حيث تتساقط الورود من السماء، كانت الأميرة سارة تنتظر مغامرة تختلف عن كل ما رأته...' },
      { childName: 'علي', preview: 'ارتفعت مركبة الفضاء وعلي يمسك بها بكلتا يديه، أمامه الكون اللامتناهي وقلبه مليء بالتساؤلات...' },
      { childName: 'ريم', preview: 'غاصت ريم تحت الماء لأول مرة، وما رأته عيناها لم تتخيله في أجمل أحلامها — عالم يتلألأ...' },
      { childName: 'خالد', preview: 'اكتشف خالد قوته الخارقة في يوم عادي، لكن مع القوة جاءت مسؤولية لم يكن يتوقعها...' },
      { childName: 'نورة', preview: 'دخلت نورة الغابة السرية التي لم يدخلها أحد من القرية، وفوجئت بصوت يناديها بالاسم...' }
    ]
  }
};

const enAdditional = {
  stories: {
    ...en.stories,
    lockNotice: {
      title: "Preview System:",
      desc: "You can watch 30% of each story for free — the rest is revealed after ordering your custom book",
      available: "30% Available",
      locked: "70% Locked",
      complete: "Completes on Order"
    },
    storyPreview: {
      storyOf: "Story of",
      theme: "Theme:",
      continued: "And the story continues in an exciting adventure full of surprises and lessons...",
      cta: "✨ Start making your story now"
    },
    catchy: {
      moreStories: "More Stories 📚",
      moreMemories: "More Memories",
      moreHappiness: "More Happiness ✨"
    },
    bottomCta: {
      title: "Do you want a story with your child's name?",
      desc: "Create a fully customized story for your child — they are the hero, the theme is the tale",
      btn: "✨ Start making your story now"
    },
    modal: {
      title: "Previewing Story of",
      notice: "This preview shows only 30% of the custom story",
      btn: "✨ Start making your full version",
      filler: "Suddenly, everything changed before their eyes and a new journey full of challenges began, requiring courage and intelligence. Will they reach their goal?"
    },
    samples: [
      { childName: 'Mohammed', preview: 'In an endless desert, Mohammed bravely set off like never before. His heart was beating fast and his eyes shining with explorer curiosity...' },
      { childName: 'Sarah', preview: 'In a kingdom where roses fall from the sky, Princess Sarah was waiting for an adventure unlike anything she had ever seen...' },
      { childName: 'Ali', preview: 'The spaceship rose and Ali held it with both hands, the infinite universe before him and his heart full of questions...' },
      { childName: 'Reem', preview: 'Reem dove underwater for the first time, and what her eyes saw she could not imagine in her most beautiful dreams — a glittering world...' },
      { childName: 'Khaled', preview: 'Khaled discovered his superpower on a normal day, but with power came a responsibility he did not expect...' },
      { childName: 'Noura', preview: 'Noura entered the secret forest that no one from the village had entered, and was surprised by a voice calling her name...' }
    ]
  }
};

const heAdditional = {
  stories: {
    ...he.stories,
    lockNotice: {
      title: "מערכת תצוגה מקדימה:",
      desc: "ניתן לצפות ב-30% מכל סיפור בחינם — השאר נחשף לאחר הזמנת הספר המותאם אישית שלך",
      available: "30% זמין",
      locked: "70% נעול",
      complete: "מושלם בהזמנה"
    },
    storyPreview: {
      storyOf: "הסיפור של",
      theme: "נושא:",
      continued: "והסיפור ממשיך בהרפתקה מרתקת מלאה בהפתעות ושיעורים...",
      cta: "✨ התחל להכין את הסיפור שלך עכשיו"
    },
    catchy: {
      moreStories: "יותר סיפורים 📚",
      moreMemories: "יותר זיכרונות",
      moreHappiness: "יותר אושר ✨"
    },
    bottomCta: {
      title: "האם תרצה סיפור עם שם ילדך?",
      desc: "צור סיפור מותאם אישית לחלוטין לילדך — הם הגיבורים, הנושא הוא המעשייה",
      btn: "✨ התחל להכין את הסיפור שלך עכשיו"
    },
    modal: {
      title: "תצוגה מקדימה לסיפור של",
      notice: "תצוגה זו מראה רק 30% מהסיפור המותאם אישית",
      btn: "✨ התחל ליצור את הגרסה המלאה שלך",
      filler: "פתאום, הכל השתנה מול עיניהם והחל מסע חדש מלא באתגרים הדורש אומץ ותבונה. האם הם יצליחו להגיע למטרתם?"
    },
    samples: [
      { childName: 'מוחמד', preview: 'במדבר אינסופי, מוחמד יצא באומץ כפי שלא עשה מעולם. ליבו פעם מהר ועיניו זהרו מסקרנות של חוקר...' },
      { childName: 'שרה', preview: 'בממלכה שבה ורדים נופלים מהשמיים, הנסיכה שרה חיכתה להרפתקה שונה מכל מה שראתה אי פעם...' },
      { childName: 'עלי', preview: 'ספינת החלל התרוממה ועלי החזיק בה בשתי ידיו, היקום האינסופי לפניו וליבו מלא בשאלות...' },
      { childName: 'רים', preview: 'רים צללה מתחת למים בפעם הראשונה, ומה שראו עיניה לא יכלה לדמיין בחלומותיה היפים ביותר — עולם מנצנץ...' },
      { childName: 'חאלד', preview: 'חאלד גילה את כוח העל שלו ביום רגיל, אך עם הכוח הגיעה אחריות שלא ציפה לה...' },
      { childName: 'נורה', preview: 'נורה נכנסה ליער הסודי שאף אחד מהכפר לא נכנס אליו, והופתעה מקול שקרא בשמה...' }
    ]
  }
};

ar.stories = arAdditional.stories;
en.stories = enAdditional.stories;
he.stories = heAdditional.stories;

fs.writeFileSync('./src/locales/ar.json', JSON.stringify(ar, null, 2));
fs.writeFileSync('./src/locales/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('./src/locales/he.json', JSON.stringify(he, null, 2));
console.log("Updated stories locales.");
