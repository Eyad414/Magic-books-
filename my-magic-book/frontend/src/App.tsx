import { Routes, Route } from 'react-router-dom';
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

import { useEffect } from 'react';
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

  // Count the visit once per browser, per day. The id is made up here and never
  // leaves this device except as an opaque string — the dashboard wants a
  // number of people, not who they are. Admin pages are skipped so the owner
  // reading the dashboard does not inflate their own visitor count.
  useEffect(() => {
    if (isLoading) return;
    if (window.location.pathname.startsWith('/admin')) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('mmb_counted') === today) return;
    let visitorId = localStorage.getItem('mmb_visitor');
    if (!visitorId) {
      visitorId = (crypto.randomUUID?.() || String(Math.random()).slice(2)) as string;
      localStorage.setItem('mmb_visitor', visitorId);
    }
    // Mark it counted only once the server has it. Marking first meant a
    // visit lost to a dropped request was lost for the rest of the day —
    // the browser would never try again.
    publicApi
      // Where they came from (the site, never the page they were on), and who
      // they are — but only when they are signed in on this browser. A visitor
      // who has not told us who they are stays anonymous.
      .trackVisit(visitorId, window.location.pathname, document.referrer, user?.id)
      .then(() => localStorage.setItem('mmb_counted', today))
      .catch(() => { /* try again on the next page load */ });
    // Waits for auth so a signed-in visit carries its account rather than
    // landing anonymously a moment before the session resolves.
  }, [isLoading, user?.id]);

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
