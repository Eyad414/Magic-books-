import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  /** Width utility for the content panel (default max-w-2xl). */
  size?: string;
  closeLabel?: string;
}

/**
 * Shared modal shell. Portaled to <body> so it escapes MainLayout's
 * `<main relative z-10>` stacking context — otherwise the fixed Navbar (z-50)
 * and Footer (z-10) paint on top of it. Handles the full-screen dim backdrop
 * (click to close) and the corner close button; callers supply only content.
 */
export default function Modal({ onClose, children, size = 'max-w-2xl', closeLabel = 'إغلاق' }: ModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full ${size} my-8 bg-dark-800 border border-white/10 rounded-2xl shadow-2xl p-6`}>
        <button
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute top-4 left-4 p-2 rounded-full bg-white/5 hover:bg-gold-500 hover:text-dark-900 text-white/50 transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
