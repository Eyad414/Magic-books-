const fs = require('fs');
const path = require('path');

const arLoc = path.join(__dirname, 'src/locales/ar/translation.json');
const enLoc = path.join(__dirname, 'src/locales/en/translation.json');
const heLoc = path.join(__dirname, 'src/locales/he/translation.json');

const arData = JSON.parse(fs.readFileSync(arLoc, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enLoc, 'utf8'));
const heData = JSON.parse(fs.readFileSync(heLoc, 'utf8'));

arData.admin = {
    "unauthorized": "غير مصرح لك بالدخول إلى هذه الصفحة",
    "add_admin_success": "تم إضافة مسؤول جديد للفريق!",
    "add_admin_fail": "فشل في إضافة المسؤول",
    "save_settings_fail": "فشل في حفظ الإعدادات",
    "loading": "جاري التحميل...",
    "panel_title": "لوحة الإدارة",
    "tab_orders": "طلبات العملاء",
    "tab_stories": "القصص والمواضيع",
    "tab_pricing": "الأسعار والباقات",
    "tab_team": "فريق العمل",
    "orders_title": "إدارة طلبات العملاء",
    "refresh_data": "تحديث البيانات",
    "no_new_orders": "لا توجد طلبات جديدة حالياً",
    "paid": "مدفوع",
    "pending_payment": "بانتظار الدفع",
    "customer_info": "معلومات العميل",
    "story_details": "تفاصيل القصة",
    "no_name": "بدون اسم",
    "theme": "موضوع:",
    "amount": "المبلغ:",
    "view_story_review": "عرض القصة للمراجعة",
    "send_to_print": "إرسال للطباعة",
    "team_title": "إدارة فريق العمل",
    "add_new_admin": "إضافة مسؤول جديد",
    "name": "الاسم",
    "email": "البريد",
    "password": "كلمة المرور",
    "add_admin_btn": "إضافة مسؤول",
    "admin_role": "Admin",
    "pricing_title": "إدارة الأسعار والباقات",
    "price_sar": "السعر (ريال/شيكل)",
    "description": "الوصف",
    "save_pricing": "حفظ أسعار الباقات",
    "stories_title": "إدارة القصص والمواضيع",
    "emoji_icon": "الأيقونة (Emoji)",
    "add_new_theme": "+ إضافة موضوع جديد",
    "save_themes": "حفظ المواضيع"
};

enData.admin = {
    "unauthorized": "You are not authorized to access this page",
    "add_admin_success": "New admin added successfully!",
    "add_admin_fail": "Failed to add admin",
    "save_settings_fail": "Failed to save settings",
    "loading": "Loading...",
    "panel_title": "Admin Panel",
    "tab_orders": "Customer Orders",
    "tab_stories": "Stories & Themes",
    "tab_pricing": "Pricing & Packages",
    "tab_team": "Team Management",
    "orders_title": "Customer Orders Management",
    "refresh_data": "Refresh Data",
    "no_new_orders": "No new orders currently",
    "paid": "Paid",
    "pending_payment": "Pending Payment",
    "customer_info": "Customer Information",
    "story_details": "Story Details",
    "no_name": "No Name",
    "theme": "Theme:",
    "amount": "Amount:",
    "view_story_review": "View Story for Review",
    "send_to_print": "Send to Print",
    "team_title": "Team Management",
    "add_new_admin": "Add New Admin",
    "name": "Name",
    "email": "Email",
    "password": "Password",
    "add_admin_btn": "Add Admin",
    "admin_role": "Admin",
    "pricing_title": "Pricing & Packages Management",
    "price_sar": "Price (SAR/ILS)",
    "description": "Description",
    "save_pricing": "Save Pricing Packages",
    "stories_title": "Stories & Themes Management",
    "emoji_icon": "Emoji Icon",
    "add_new_theme": "+ Add New Theme",
    "save_themes": "Save Themes"
};

heData.admin = {
    "unauthorized": "אינך מורשה לגשת לדף זה",
    "add_admin_success": "מנהל חדש נוסף בהצלחה!",
    "add_admin_fail": "נכשל בהוספת מנהל",
    "save_settings_fail": "נכשל בשמירת הגדרות",
    "loading": "טוען...",
    "panel_title": "לוח ניהול",
    "tab_orders": "הזמנות לקוחות",
    "tab_stories": "סיפורים ונושאים",
    "tab_pricing": "תמחור וחבילות",
    "tab_team": "ניהול צוות",
    "orders_title": "ניהול הזמנות לקוחות",
    "refresh_data": "רענן נתונים",
    "no_new_orders": "אין כרגע הזמנות חדשות",
    "paid": "שולם",
    "pending_payment": "ממתין לתשלום",
    "customer_info": "פרטי לקוח",
    "story_details": "פרטי סיפור",
    "no_name": "ללא שם",
    "theme": "נושא:",
    "amount": "סכום:",
    "view_story_review": "הצג סיפור לבדיקה",
    "send_to_print": "שלח להדפסה",
    "team_title": "ניהול צוות",
    "add_new_admin": "הוסף מנהל חדש",
    "name": "שם",
    "email": "דוא\"ל",
    "password": "סיסמה",
    "add_admin_btn": "הוסף מנהל",
    "admin_role": "מנהל",
    "pricing_title": "ניהול תמחור וחבילות",
    "price_sar": "מחיר (SAR/ILS)",
    "description": "תיאור",
    "save_pricing": "שמור חבילות תמחור",
    "stories_title": "ניהול סיפורים ונושאים",
    "emoji_icon": "סמל Emoji",
    "add_new_theme": "+ הוסף נושא חדש",
    "save_themes": "שמור נושאים"
};

fs.writeFileSync(arLoc, JSON.stringify(arData, null, 2));
fs.writeFileSync(enLoc, JSON.stringify(enData, null, 2));
fs.writeFileSync(heLoc, JSON.stringify(heData, null, 2));

console.log("Locales updated!");
