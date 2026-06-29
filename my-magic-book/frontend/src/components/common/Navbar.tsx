import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, LayoutDashboard, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStoryProgress } from '../../context/StoryProgressContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const navLinks = [
  { to: '/', labelKey: 'home' },
  { to: '/stories', labelKey: 'stories' },
  { to: '/about', labelKey: 'about' },
  { to: '/contact', labelKey: 'contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { resetProgress } = useStoryProgress();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  const handleCreateNewStory = (e: React.MouseEvent) => {
    e.preventDefault();
    resetProgress();
    navigate('/create');
    setIsOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${scrolled
        ? 'bg-dark-900/95 backdrop-blur-lg border-b border-gold-500/20 shadow-lg'
        : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img
              src="/logo-main.jpg"
              alt="Magic Fanoose — ماجيك فانوس"
              className="h-12 md:h-16 w-auto object-contain rounded-xl transition-transform group-hover:scale-105 drop-shadow-[0_0_10px_rgba(212,169,55,0.4)]"
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl font-arabic font-medium transition-all duration-200 text-sm ${isActive
                    ? 'text-gold-500 bg-gold-500/10'
                    : 'text-white/80 hover:text-gold-400 hover:bg-white/5'
                  }`
                }
              >
                {t(`nav.${link.labelKey}`)}
              </NavLink>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <button
              id="navbar-create-btn"
              onClick={handleCreateNewStory}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-bold text-sm transition-all duration-300 hover:shadow-gold-glow hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('nav.create_story')}</span>
            </button>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-800/70 border border-white/10 hover:border-gold-500/40 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-magic-500 to-navy-800 flex items-center justify-center">
                    <User className="w-4 h-4 text-gold-500" />
                  </div>
                  <span className="font-arabic text-sm text-white/90">{user?.name?.split(' ')[0]}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 glass-card rounded-xl overflow-hidden shadow-card py-1">
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-arabic text-white/80 hover:text-gold-500 hover:bg-white/5 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {t('nav.dashboard')}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-arabic text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                id="navbar-login-btn"
                className="px-4 py-2.5 rounded-xl border border-gold-500/40 text-gold-500 font-arabic font-medium text-sm hover:bg-gold-500/10 transition-all"
              >
                {t('nav.login')}
              </Link>
            )}


          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-xl text-white/80 hover:text-gold-500 hover:bg-white/5"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={t('nav.menu_label')}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-dark-900/98 backdrop-blur-xl border-t border-white/10">
          <div className="px-4 py-4 space-y-2">
            
            <div className="flex justify-end pb-2 mb-2 border-b border-white/5">
              <LanguageSwitcher />
            </div>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-xl font-arabic font-medium transition-all ${isActive ? 'text-gold-500 bg-gold-500/10' : 'text-white/80'
                  }`
                }
              >
                {t(`nav.${link.labelKey}`)}
              </NavLink>
            ))}
            <button
              onClick={handleCreateNewStory}
              className="w-full block px-4 py-3 rounded-xl bg-gold-500 text-dark-900 font-arabic font-bold text-center"
            >
              ✨ {t('home.final_cta_btn')}
            </button>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className="block px-4 py-3 rounded-xl text-white/80 font-arabic text-right">
                  {t('nav.dashboard')}
                </Link>
                <button onClick={handleLogout} className="block w-full px-4 py-3 rounded-xl text-red-400 font-arabic text-right">
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)} className="block px-4 py-3 rounded-xl border border-gold-500/40 text-gold-500 font-arabic text-center">
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

