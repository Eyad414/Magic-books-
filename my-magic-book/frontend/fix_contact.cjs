const fs = require('fs');

const ar = require('./src/locales/ar.json');
const en = require('./src/locales/en.json');
const he = require('./src/locales/he.json');

// Arabic
ar.contact.phoneLabel = "رقم الهاتف";
ar.contact.phonePlaceholder = "05XXXXXXXX";
ar.contact.subjectLabel = "الموضوع *";
ar.contact.subjectOptions = {
  default: "اختر الموضوع",
  general: "استفسار عام",
  order: "مشكلة في الطلب",
  tech: "مشكلة تقنية",
  refund: "إلغاء أو استرداد",
  suggestion: "اقتراح",
  other: "أخرى"
};

// English
en.contact.phoneLabel = "Phone Number";
en.contact.phonePlaceholder = "05XXXXXXXX";
en.contact.subjectLabel = "Subject *";
en.contact.subjectOptions = {
  default: "Select Subject",
  general: "General Inquiry",
  order: "Order Issue",
  tech: "Technical Issue",
  refund: "Cancel or Refund",
  suggestion: "Suggestion",
  other: "Other"
};

// Hebrew
he.contact.phoneLabel = "מספר טלפון";
he.contact.phonePlaceholder = "05XXXXXXXX";
he.contact.subjectLabel = "נושא *";
he.contact.subjectOptions = {
  default: "בחר נושא",
  general: "בירור כללי",
  order: "בעיה בהזמנה",
  tech: "בעיה טכנית",
  refund: "ביטול או החזר",
  suggestion: "הצעה",
  other: "אחר"
};

fs.writeFileSync('./src/locales/ar.json', JSON.stringify(ar, null, 2));
fs.writeFileSync('./src/locales/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('./src/locales/he.json', JSON.stringify(he, null, 2));
