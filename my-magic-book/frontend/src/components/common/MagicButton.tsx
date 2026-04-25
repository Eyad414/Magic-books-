import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface MagicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'gold' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variants = {
  gold: 'bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 hover:shadow-gold-glow hover:-translate-y-0.5 font-bold',
  outline: 'border-2 border-gold-500/60 text-gold-500 hover:bg-gold-500/10 hover:border-gold-500',
  ghost: 'text-white/80 hover:text-gold-500 hover:bg-white/5',
  danger: 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30',
};

const sizes = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3 text-base rounded-xl',
  xl: 'px-10 py-4 text-lg rounded-2xl',
};

export default function MagicButton({
  children,
  variant = 'gold',
  size = 'md',
  isLoading = false,
  icon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: MagicButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-arabic font-medium
        transition-all duration-300
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
