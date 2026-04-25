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

export default function App() {
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
            fontFamily: 'Noto Kufi Arabic, sans-serif',
            direction: 'rtl',
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
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </>
  );
}
