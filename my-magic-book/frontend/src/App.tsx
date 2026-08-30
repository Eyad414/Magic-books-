import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Stories from './pages/Stories';

import AccessibilityWidget from './components/common/AccessibilityWidget';
import AdminBookGuard from './components/common/AdminBookGuard';
import RequireAuth from './components/common/RequireAuth';

import { useEffect, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { publicApi } from './api/publicApi';
import { useAuth } from './context/AuthContext';
import BirthdayPrompt from './components/common/BirthdayPrompt';

/**
 * Everything past the front door is fetched when someone actually goes there.
 *
 * One bundle used to carry the whole site — the admin dashboard, the book
 * viewer, the story wizard — to every visitor, including a parent who tapped
 * a link on their phone to look at the home page. 402 KB of compressed
 * JavaScript before anything could be read.
 *
 * Home and Stories stay eager on purpose: they are where people land, and a
 * spinner on the page someone arrives at costs more than the bytes it saves.
 */
const CreateStory = lazy(() => import('./pages/CreateStory'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const Policy = lazy(() => import('./pages/Policy'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StoryBookPage = lazy(() => import('./pages/StoryBookPage'));
const ColoringBookPage = lazy(() => import('./pages/ColoringBookPage'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));


/**
 * Shown only while a route's code is on its way. Deliberately the site's own
 * background with a quiet lantern rather than a white flash or a spinner: on a
 * fast connection it is gone before it registers, and on a slow one it should
 * look like the page arriving, not like something broken.
 */
function RouteLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
      <div className="text-4xl animate-pulse" aria-hidden="true">🏮</div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default function App() {
  const { i18n } = useTranslation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Determine the direction
    const dir = i18n.dir();
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;

    // Apply language-specific class to body/html for font styling
    document.documentElement.className = `lang-${i18n.language.split('-')[0]}`;
  }, [i18n.language]);

  // Follow the visit, page by page. The id is made up here and never leaves
  // this device except as an opaque string — the dashboard wants a number of
  // people and what they looked at, not who they are. Admin pages are skipped
  // so the owner reading the dashboard does not inflate their own numbers.
  //
  // This used to fire ONCE per browser per day and then stop, which is why
  // every visitor in the dashboard appeared to open a single page and leave:
  // that was not their behaviour, it was the only page we ever recorded. The
  // server already counts views and appends paths on each call, so following
  // the route is all that was missing.
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const path = location.pathname;
    if (path.startsWith('/admin')) return;
    // React re-runs effects on re-render; only a genuine move counts.
    if (lastPath.current === path) return;
    lastPath.current = path;

    let visitorId = localStorage.getItem('mmb_visitor');
    if (!visitorId) {
      visitorId = (crypto.randomUUID?.() || String(Math.random()).slice(2)) as string;
      localStorage.setItem('mmb_visitor', visitorId);
    }
    publicApi
      // Where they came from (the site, never the page they were on), and who
      // they are — but only when they are signed in on this browser. A visitor
      // who has not told us who they are stays anonymous.
      .trackVisit(visitorId, path, {
        referrer: document.referrer,
        userId: user?.id,
        lang: i18n.language.split('-')[0],
        // The page reports its own width rather than the server reading a user
        // agent — same answer, far less about the person.
        device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      })
      .catch(() => { /* a lost page view is not worth retrying */ });
    // Waits for auth so a signed-in visit carries its account rather than
    // landing anonymously a moment before the session resolves.
  }, [isLoading, user?.id, location.pathname]);

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1B1F5E',
            color: '#e8eaf6',
            border: '1px solid rgba(245,166,35,0.3)',
            borderRadius: '12px',
            fontFamily: i18n.language.startsWith('ar') ? 'Noto Kufi Arabic, sans-serif' : 'Inter, sans-serif',
            direction: i18n.dir(),
          },
          success: {
            iconTheme: { primary: '#F5A623', secondary: '#0D0F1A' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#0D0F1A' },
          },
        }}
      />
      <BirthdayPrompt />
      <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="stories" element={<Stories />} />
          {/* Creating a story needs an account: the wizard uploads the child's
              photo and the cover preview quota is per-account. RequireAuth
              remembers the destination, so login lands them back here. */}
          <Route path="create" element={<RequireAuth><CreateStory /></RequireAuth>} />
          <Route path="about" element={<AboutUs />} />
          <Route path="contact" element={<ContactUs />} />
          <Route path="policy" element={<Policy />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="order/success" element={<OrderSuccess />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="book" element={<AdminBookGuard><StoryBookPage /></AdminBookGuard>} />
          {/* Customers can view their OWN finished book (story or coloring).
              Privacy is enforced server-side: the page loads via getMyStories. */}
          <Route path="book/:storyId" element={<RequireAuth><StoryBookPage /></RequireAuth>} />
          <Route path="coloring/:themeId" element={<AdminBookGuard><ColoringBookPage /></AdminBookGuard>} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
      </Suspense>
      <AccessibilityWidget />
    </>
  );
}
