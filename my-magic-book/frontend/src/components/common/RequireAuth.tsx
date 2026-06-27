// ─── RequireAuth ─────────────────────────────────────────────────────────────
// Protects a route so any LOGGED-IN user can access it (not admin-only).
// Used for customer book viewing — privacy is enforced server-side because the
// page loads the story via getMyStories(), which only returns the user's own.

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-14 h-14 rounded-full border-4 border-gold-500/30 border-t-gold-500 animate-spin" aria-label="جارٍ التحقق…" />
      </div>
    );
  }

  if (!user) {
    // Send to login, remembering where they wanted to go.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
