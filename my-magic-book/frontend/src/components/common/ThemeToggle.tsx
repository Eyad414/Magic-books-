import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

/**
 * Dark / light switch, styled to sit beside the language switcher.
 *
 * Shows the icon of the theme it will SWITCH TO, which is what a person reads a
 * single-button toggle as — a moon while you are in the light, a sun while you
 * are in the dark. The label says it out loud for screen readers, since the
 * icon alone does not say which direction it goes.
 */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  const goingToLight = theme === 'dark';

  const label = goingToLight
    ? (t('theme.to_light', 'الوضع النهاري') as string)
    : (t('theme.to_dark', 'الوضع الليلي') as string);

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-gold-500 hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
    >
      {goingToLight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
