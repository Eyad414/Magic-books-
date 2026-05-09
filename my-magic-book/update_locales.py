import json
import os

locales = ['ar', 'en', 'he']

new_keys = {
    'ar': {
        "about": {
            "hero_title_1": "نؤمن بأن كل طفل ",
            "hero_title_2": "يستحق قصة بطولته",
            "hero_desc": "كتابي السحري هو منصة عربية رائدة تجمع بين الذكاء الاصطناعي وحب الأطفال لصنع قصص مطبوعة تُبقى معهم إلى الأبد",
            "rating_text": "تقييم 5/5 من أكثر من 100 عائلة",
            "stats_themes": "موضوع قصة",
            "stats_languages": "لغات متاحة",
            "founder_title_1": "المؤسس ",
            "founder_title_2": "المبدع",
            "founder_role": "مهندس برمجيات يؤمن بأن التكنولوجيا وُجدت لتخدم أحلامنا و تحويلها لحقيقه  🤖📖",
            "mission_title": "مهمتنا",
            "mission_desc": "نهدف إلى جعل القراءة تجربة سحرية ومخصصة لكل طفل عربي. نؤمن بأن الطفل الذي يرى نفسه بطلاً في قصة يُصبح قارئاً شغوفاً مدى الحياة.",
            "values_title": "قيمنا وما نؤمن به",
            "values": {
                "1_title": "الشغف بالأطفال",
                "1_desc": "كل قصة نصنعها بحب حقيقي للأطفال وإيمان بقيمة القراءة",
                "2_title": "الجودة أولاً",
                "2_desc": "نستخدم أفضل تقنيات الذكاء الاصطناعي لضمان قصص عالية الجودة",
                "3_title": "ثقافة عربية",
                "3_desc": "نفخر بتقديم محتوى عربي أصيل يعزز هوية أطفالنا",
                "4_title": "تخصيص كامل",
                "4_desc": "كل كتاب مختلف تماماً — مخصص بشكل فريد لطفلك",
                "5_title": "سرعة الطباعة",
                "5_desc": "نعمل بأقصى سرعة لطباعة قصتك وتوصيلها حتى باب منزلك خلال أيام معدودة",
                "6_title": "لغات متعددة",
                "6_desc": "ندعم أكثر من لغة (العربية، الإنجليزية، والعبرية) لتلائم تنوع وثقافة جميع العائلات"
            },
            "faq_title_1": "الأسئلة ",
            "faq_title_2": "الشائعة",
            "faqs": {
                "1_q": "كيف أبني هذا الكتاب؟",
                "1_a": "عن طريق واجهتنا السهلة، أدخل تفاصيل طفلك واختر موضوع القصة، وسيقوم الذكاء الاصطناعي بباقي العمل بلمح البصر!",
                "2_q": "كم يستغرق صنع وتوصيل الكتاب؟",
                "2_a": "توليد القصة فوري، وبمجرد اعتمادك للطلب، يتم طباعة الكتاب وإيصاله إليك خلال 3 إلى 5 أيام عمل.",
                "3_q": "هل الكتاب مناسب لجميع الأعمار؟",
                "3_a": "نعم! نحن نخصص لغة القصة وأسلوبها لتناسب الفئة العمرية التي تختارها بدقة تامة.",
                "4_q": "هل يمكنني رؤية القصة قبل الشراء؟",
                "4_a": "بالتأكيد! يمكنك رؤية 30٪ من القصة ومعاينة الغلاف مجاناً قبل الدفع والتأكيد.",
                "5_q": "ما نوع المواد المستخدمة في صنع الكتاب؟",
                "5_a": "نستخدم ورق عالي الجودة، طباعة ملونة، وتجليد فاخر لضمان كتاب يدوم طويلاً ويبقى ذكرى جميلة."
            },
            "cta_title": "هل أنت مستعد؟",
            "cta_desc": "ابدأ اليوم وامنح طفلك تجربة لا تُنسى",
            "cta_btn": "✨ ابدأ قصتك السحرية"
        },
        "contact": {
            "title": "تواصل معنا",
            "desc": "نحن هنا لمساعدتك! لا تتردد في التواصل معنا بأي وقت",
            "info_title": "معلومات التواصل",
            "info_email": "البريد الإلكتروني",
            "info_phone": "رقم الهاتف",
            "info_whatsapp": "واتساب",
            "whatsapp_value": "تواصل عبر واتساب",
            "quick_response_title": "💬 متواجدون دائماً",
            "quick_response_desc": "نعمل على مدار الساعة (24/7) لخدمتكم.<br />سيتم الرد على استفسارك في أقرب وقت ممكن.",
            "form_title": "أرسل لنا رسالة",
            "form_name": "الاسم *",
            "form_name_ph": "اسمك الكامل",
            "form_email": "البريد الإلكتروني *",
            "form_email_ph": "email@example.com",
            "form_phone": "رقم الهاتف",
            "form_phone_ph": "05XXXXXXXX",
            "form_subject": "الموضوع *",
            "subject_ph": "اختر الموضوع",
            "subject_opt_1": "استفسار عام",
            "subject_opt_2": "مشكلة في الطلب",
            "subject_opt_3": "مشكلة تقنية",
            "subject_opt_4": "إلغاء أو استرداد",
            "subject_opt_5": "اقتراح",
            "subject_opt_6": "أخرى",
            "form_message": "الرسالة *",
            "form_message_ph": "اكتب رسالتك هنا...",
            "form_btn": "إرسال الرسالة",
            "toast_success": "تم إرسال رسالتك! سيتواصل معك فريقنا قريباً 💌",
            "toast_error": "فشل في إرسال الرسالة — يرجى المحاولة مجدداً"
        }
    },
    'en': {
        "about": {
            "hero_title_1": "We believe every child ",
            "hero_title_2": "deserves a story of their heroism",
            "hero_desc": "My Magic Book is a leading platform combining AI and a love for children to create printed stories that stay with them forever.",
            "rating_text": "Rated 5/5 by over 100 families",
            "stats_themes": "Story Themes",
            "stats_languages": "Available Languages",
            "founder_title_1": "The Creative ",
            "founder_title_2": "Founder",
            "founder_role": "Software Engineer who believes technology exists to serve our dreams and turn them into reality 🤖📖",
            "mission_title": "Our Mission",
            "mission_desc": "We aim to make reading a magical and personalized experience for every child. We believe a child who sees themselves as the hero in a story becomes a passionate reader for life.",
            "values_title": "Our Values and Beliefs",
            "values": {
                "1_title": "Passion for Children",
                "1_desc": "Every story we create is made with genuine love for children and belief in the value of reading.",
                "2_title": "Quality First",
                "2_desc": "We use the best AI technologies to ensure high-quality stories.",
                "3_title": "Cultural Identity",
                "3_desc": "We pride ourselves on providing authentic content that reinforces our children's identity.",
                "4_title": "Full Customization",
                "4_desc": "Every book is completely different — uniquely customized for your child.",
                "5_title": "Fast Printing",
                "5_desc": "We work at top speed to print your story and deliver it to your door within days.",
                "6_title": "Multiple Languages",
                "6_desc": "We support multiple languages to suit the diversity and culture of all families."
            },
            "faq_title_1": "Frequently Asked ",
            "faq_title_2": "Questions",
            "faqs": {
                "1_q": "How do I build this book?",
                "1_a": "Through our easy interface, enter your child's details and choose the story theme, and the AI will do the rest in a flash!",
                "2_q": "How long does it take to make and deliver the book?",
                "2_a": "Story generation is instant. Once you approve the order, the book is printed and delivered to you within 3 to 5 business days.",
                "3_q": "Is the book suitable for all ages?",
                "3_a": "Yes! We precisely customize the story's language and style to suit the age group you choose.",
                "4_q": "Can I see the story before buying?",
                "4_a": "Absolutely! You can see 30% of the story and preview the cover for free before paying and confirming.",
                "5_q": "What materials are used to make the book?",
                "5_a": "We use high-quality paper, color printing, and premium binding to ensure a long-lasting book and a beautiful memory."
            },
            "cta_title": "Are you ready?",
            "cta_desc": "Start today and give your child an unforgettable experience.",
            "cta_btn": "✨ Start Your Magic Story"
        },
        "contact": {
            "title": "Contact Us",
            "desc": "We're here to help! Feel free to contact us anytime.",
            "info_title": "Contact Information",
            "info_email": "Email",
            "info_phone": "Phone Number",
            "info_whatsapp": "WhatsApp",
            "whatsapp_value": "Contact via WhatsApp",
            "quick_response_title": "💬 Always Available",
            "quick_response_desc": "We work around the clock (24/7) to serve you.<br />Your inquiry will be answered as soon as possible.",
            "form_title": "Send Us a Message",
            "form_name": "Name *",
            "form_name_ph": "Your full name",
            "form_email": "Email *",
            "form_email_ph": "email@example.com",
            "form_phone": "Phone Number",
            "form_phone_ph": "05XXXXXXXX",
            "form_subject": "Subject *",
            "subject_ph": "Choose Subject",
            "subject_opt_1": "General Inquiry",
            "subject_opt_2": "Order Issue",
            "subject_opt_3": "Technical Issue",
            "subject_opt_4": "Cancellation or Refund",
            "subject_opt_5": "Suggestion",
            "subject_opt_6": "Other",
            "form_message": "Message *",
            "form_message_ph": "Write your message here...",
            "form_btn": "Send Message",
            "toast_success": "Your message has been sent! Our team will contact you shortly 💌",
            "toast_error": "Failed to send message — please try again"
        }
    },
    'he': {
        "about": {
            "hero_title_1": "אנו מאמינים שכל ילד ",
            "hero_title_2": "ראוי לסיפור הגבורה שלו",
            "hero_desc": "הספר הקסום שלי היא פלטפורמה מובילה המשלבת בינה מלאכותית ואהבה לילדים ליצירת סיפורים מודפסים שיישארו איתם לנצח.",
            "rating_text": "מדורג 5/5 על ידי למעלה מ-100 משפחות",
            "stats_themes": "נושאי סיפור",
            "stats_languages": "שפות זמינות",
            "founder_title_1": "המייסד ",
            "founder_title_2": "היצירתי",
            "founder_role": "מהנדס תוכנה המאמין שטכנולוגיה נועדה לשרת את החלומות שלנו ולהפוך אותם למציאות 🤖📖",
            "mission_title": "המשימה שלנו",
            "mission_desc": "אנו שואפים להפוך את הקריאה לחוויה קסומה ומותאמת אישית לכל ילד. אנו מאמינים שילד שרואה את עצמו כגיבור בסיפור הופך לקורא נלהב לכל החיים.",
            "values_title": "הערכים והאמונות שלנו",
            "values": {
                "1_title": "תשוקה לילדים",
                "1_desc": "כל סיפור שאנו יוצרים נעשה באהבה אמיתית לילדים ואמונה בערך הקריאה.",
                "2_title": "איכות לפני הכל",
                "2_desc": "אנו משתמשים בטכנולוגיות הבינה המלאכותית הטובות ביותר כדי להבטיח סיפורים באיכות גבוהה.",
                "3_title": "זהות תרבותית",
                "3_desc": "אנו גאים לספק תוכן אותנטי המחזק את זהות ילדינו.",
                "4_title": "התאמה אישית מלאה",
                "4_desc": "כל ספר שונה לחלוטין - מותאם אישית באופן ייחודי לילדך.",
                "5_title": "הדפסה מהירה",
                "5_desc": "אנו פועלים במהירות שיא כדי להדפיס את הסיפור שלך ולספק אותו עד לדלת הבית תוך ימים ספורים.",
                "6_title": "ריבוי שפות",
                "6_desc": "אנו תומכים במספר שפות כדי להתאים לגיוון ולתרבות של כל המשפחות."
            },
            "faq_title_1": "שאלות ",
            "faq_title_2": "נפוצות",
            "faqs": {
                "1_q": "איך אני בונה את הספר הזה?",
                "1_a": "דרך הממשק הקל שלנו, הזן את פרטי ילדך ובחר את נושא הסיפור, והבינה המלאכותית תעשה את השאר כהרף עין!",
                "2_q": "כמה זמן לוקח להכין ולספק את הספר?",
                "2_a": "יצירת הסיפור היא מיידית. לאחר אישור ההזמנה, הספר מודפס ומסופק אליך תוך 3 עד 5 ימי עסקים.",
                "3_q": "האם הספר מתאים לכל הגילאים?",
                "3_a": "כן! אנו מתאימים במדויק את שפת הסיפור וסגנונו לקבוצת הגיל שתבחר.",
                "4_q": "האם אוכל לראות את הסיפור לפני הרכישה?",
                "4_a": "בהחלט! תוכל לראות 30% מהסיפור ולצפות בתצוגה מקדימה של הכריכה בחינם לפני התשלום והאישור.",
                "5_q": "באילו חומרים משתמשים להכנת הספר?",
                "5_a": "אנו משתמשים בנייר איכותי, הדפסה צבעונית וכריכה יוקרתית כדי להבטיח ספר עמיד לאורך זמן וזיכרון יפה."
            },
            "cta_title": "האם אתה מוכן?",
            "cta_desc": "התחל היום והענק לילדך חוויה בלתי נשכחת.",
            "cta_btn": "✨ התחל את הסיפור הקסום שלך"
        },
        "contact": {
            "title": "צור קשר",
            "desc": "אנחנו כאן כדי לעזור! אל תהסס לפנות אלינו בכל עת.",
            "info_title": "פרטי התקשרות",
            "info_email": "דוא\"ל",
            "info_phone": "מספר טלפון",
            "info_whatsapp": "וואטסאפ",
            "whatsapp_value": "צור קשר בוואטסאפ",
            "quick_response_title": "💬 זמינים תמיד",
            "quick_response_desc": "אנו עובדים מסביב לשעון (24/7) כדי לשרת אותך.<br />פנייתך תיענה בהקדם האפשרי.",
            "form_title": "שלח לנו הודעה",
            "form_name": "שם *",
            "form_name_ph": "שמך המלא",
            "form_email": "דוא\"ל *",
            "form_email_ph": "email@example.com",
            "form_phone": "מספר טלפון",
            "form_phone_ph": "05XXXXXXXX",
            "form_subject": "נושא *",
            "subject_ph": "בחר נושא",
            "subject_opt_1": "בירור כללי",
            "subject_opt_2": "בעיה בהזמנה",
            "subject_opt_3": "בעיה טכנית",
            "subject_opt_4": "ביטול או החזר",
            "subject_opt_5": "הצעה",
            "subject_opt_6": "אחר",
            "form_message": "הודעה *",
            "form_message_ph": "כתוב את הודעתך כאן...",
            "form_btn": "שלח הודעה",
            "toast_success": "הודעתך נשלחה! הצוות שלנו ייצור איתך קשר בהקדם 💌",
            "toast_error": "שליחת ההודעה נכשלה — אנא נסה שוב"
        }
    }
}

for loc in locales:
    filepath = f"frontend/src/locales/{loc}/translation.json"
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    data.update(new_keys[loc])
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Locales updated!")
