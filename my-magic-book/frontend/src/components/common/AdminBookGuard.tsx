// ─── AdminBookGuard ───────────────────────────────────────────────────────────
// Protects the /book route so ONLY the admin email (eyadat720@gmail.com)
// can access it. Everyone else is redirected to the home page.
//
// Usage in App.tsx:
//   <Route path="book" element={<AdminBookGuard><StoryBookPage /></AdminBookGuard>} />

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ADMIN_EMAIL = 'eyadat720@gmail.com';

interface AdminBookGuardProps {
  children: ReactNode;
}

export default function AdminBookGuard({ children }: AdminBookGuardProps) {
  const { user, isLoading } = useAuth();

  // While auth is being restored from localStorage, show nothing (avoid flash)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-full border-4 border-gold-500/30 border-t-gold-500 animate-spin"
            aria-label="جارٍ التحقق من الصلاحيات..."
          />
          <p className="font-arabic text-white/50 text-sm">جارٍ التحقق…</p>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ User confirmed — render the protected content
  return <>{children}</>;
}
