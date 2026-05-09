import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'he', label: 'עברית' }
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium uppercase">{i18n.language}</span>
      </button>
      
      {/* Dropdown Menu */}
      <div className="absolute top-full mt-2 w-32 rounded-xl bg-dark-800 border border-white/10 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 ltr:right-0 rtl:left-0">
        <div className="p-2 space-y-1">
          {LANGUAGES.map((lng) => (
            <button
              key={lng.code}
              onClick={() => changeLanguage(lng.code)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                i18n.language === lng.code 
                  ? 'bg-gold-500/10 text-gold-500 font-bold' 
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{lng.label}</span>
              <span className="text-xs uppercase opacity-50">{lng.code}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
