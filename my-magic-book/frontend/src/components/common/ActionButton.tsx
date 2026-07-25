import { Link } from 'react-router-dom';
import type { ReactNode, ComponentType } from 'react';

export type ActionVariant = 'gold' | 'emerald' | 'magic' | 'ghost';

const BASE =
  'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-arabic font-bold text-sm transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed';

const VARIANTS: Record<ActionVariant, string> = {
  gold: 'bg-gold-500 text-dark-900 hover:bg-gold-400 shadow-lg shadow-gold-500/10',
  emerald: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25',
  magic: 'bg-magic-500/20 text-magic-300 border border-magic-500/30 hover:bg-magic-500/30',
  ghost: 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10',
};

/** The "working" highlight (ring) shown while this action is in progress. */
const ACTIVE: Record<ActionVariant, string> = {
  gold: 'bg-gold-500 text-dark-900',
  emerald: 'bg-emerald-500/35 text-emerald-100 border border-emerald-400 ring-2 ring-emerald-400/60 cursor-wait',
  magic: 'bg-magic-500/40 text-magic-100 border border-magic-400 ring-2 ring-magic-400/60 cursor-wait',
  ghost: 'bg-white/25 text-white border border-white/40 ring-2 ring-white/40 cursor-wait',
};

interface Props {
  variant?: ActionVariant;
  icon?: ComponentType<{ className?: string }>;
  /** Spin the icon (in-progress). */
  spin?: boolean;
  /** Show the "working" ring highlight. */
  active?: boolean;
  /** Renders a react-router Link instead of a button. */
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  /** Extra classes — use Tailwind `!` utilities to fully override a state (e.g. "done"). */
  className?: string;
  children: ReactNode;
}

/** One consistent action button for the admin order cards (view / build / send /
 *  re-render / save), replacing the long style string repeated ~9× per card. */
export default function ActionButton({
  variant = 'ghost', icon: Icon, spin, active, to, onClick, disabled, title, className = '', children,
}: Props) {
  const cls = `${BASE} ${active ? ACTIVE[variant] : VARIANTS[variant]} ${className}`;
  const inner = (
    <>
      {Icon && <Icon className={`w-4 h-4 ${spin ? 'animate-spin' : ''}`} />}
      {children}
    </>
  );
  if (to) return <Link to={to} className={cls} title={title}>{inner}</Link>;
  return <button type="button" onClick={onClick} disabled={disabled} title={title} className={cls}>{inner}</button>;
}
