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

import AdminDashboard from './pages/AdminDashboard';
import StoryBookPage from './pages/StoryBookPage';
import ColoringBookPage from './pages/ColoringBookPage';
import OrderSuccess from './pages/OrderSuccess';
import AccessibilityWidget from './components/common/AccessibilityWidget';
import AdminBookGuard from './components/common/AdminBookGuard';
import RequireAuth from './components/common/RequireAuth';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Determine the direction
    const dir = i18n.dir();
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;

    // Apply language-specific class to body/html for font styling
    document.documentElement.className = `lang-${i18n.language.split('-')[0]}`;
  }, [i18n.language]);

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
          <Route path="create" element={<CreateStory />} />
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
      </Routes>
      <AccessibilityWidget />
    </>
  );
}
