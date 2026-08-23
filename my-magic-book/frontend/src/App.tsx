import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Stories from './pages/Stories';
import CreateStory from './pages/CreateStory';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import Policy from './pages/Policy';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import AdminDashboard from './pages/AdminDashboard';
import StoryBookPage from './pages/StoryBookPage';
import ColoringBookPage from './pages/ColoringBookPage';
import OrderSuccess from './pages/OrderSuccess';
import AccessibilityWidget from './components/common/AccessibilityWidget';
import AdminBookGuard from './components/common/AdminBookGuard';
import RequireAuth from './components/common/RequireAuth';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { publicApi } from './api/publicApi';
import { useAuth } from './context/AuthContext';

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
      <AccessibilityWidget />
    </>
  );
}
