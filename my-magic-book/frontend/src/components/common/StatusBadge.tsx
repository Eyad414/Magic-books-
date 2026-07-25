import type { ReactNode, ComponentType } from 'react';

export type BadgeTone = 'green' | 'gold' | 'magic' | 'red' | 'neutral';

const TONES: Record<BadgeTone, string> = {
  green: 'bg-green-500/20 text-green-400',
  gold: 'bg-gold-500/20 text-gold-500',
  magic: 'bg-magic-500/20 text-magic-300',
  red: 'bg-red-500/20 text-red-400',
  neutral: 'bg-white/10 text-white/70',
};

interface Props {
  tone?: BadgeTone;
  icon?: ComponentType<{ className?: string }>;
  /** Spin the icon (e.g. an in-progress state). */
  spin?: boolean;
  className?: string;
  children: ReactNode;
}

/** Small pill for order/payment/production statuses. Shared by the admin and
 *  customer dashboards so the paid/pending/production styles stay consistent. */
export default function StatusBadge({ tone = 'neutral', icon: Icon, spin, className = '', children }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg font-arabic ${TONES[tone]} ${className}`}>
      {Icon && <Icon className={`w-3 h-3 ${spin ? 'animate-spin' : ''}`} />}
      {children}
    </span>
  );
}
