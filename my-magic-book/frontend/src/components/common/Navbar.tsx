import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, BookOpen, User, LogOut, LayoutDashboard, Sparkles, Sun, Moon, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navLinks = [
  { to: '/', label: 'الرئيسية' },
  { to: '/stories', label: 'القصص' },
  { to: '/about', label: 'من نحن' },
  { to: '/contact', label: 'تواصل معنا' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const toggleTheme = () => {
    setIsLightTheme(!isLightTheme);
    if (!isLightTheme) {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

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
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-800 to-magic-500 flex items-center justify-center shadow-gold-glow transition-transform group-hover:scale-110">
              <BookOpen className="w-5 h-5 text-gold-500" />
            </div>
            <div className="flex flex-col">
              <span className="font-arabic font-bold text-gold-500 text-lg leading-tight">كتابي السحري</span>
              <span className="text-white/40 text-xs leading-tight">My Magic Book</span>
            </div>
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
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/create"
              id="navbar-create-btn"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-bold text-sm transition-all duration-300 hover:shadow-gold-glow hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>ابدأ قصتك</span>
            </Link>

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
                      لوحة التحكم
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-arabic text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      تسجيل الخروج
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
                تسجيل الدخول
              </Link>
            )}

            {/* Theme Toggle & Language */}
            <div className="flex items-center gap-4 border-r border-white/10 pr-4 mr-2">
              <div className="relative flex items-center text-white/80 hover:text-gold-500 transition-colors bg-white/5 rounded-lg px-2 py-1 border border-white/10">
                <Globe className="w-4 h-4 ml-1" />
                <select className="bg-transparent text-sm font-arabic outline-none cursor-pointer appearance-none ml-1 pl-2">
                  <option value="ar" className="text-dark-900">عربي</option>
                  <option value="en" className="text-dark-900">English</option>
                  <option value="he" className="text-dark-900">עברית</option>
                </select>
              </div>
              
              <button 
                onClick={toggleTheme} 
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-gold-500 hover:border-gold-500/40 transition-all" 
                title="تغيير المظهر"
              >
                {isLightTheme ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-xl text-white/80 hover:text-gold-500 hover:bg-white/5"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="قائمة التنقل"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-dark-900/98 backdrop-blur-xl border-t border-white/10">
          <div className="px-4 py-4 space-y-2">
            
            {/* Settings Mobile */}
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4 px-4 pt-2">
              <div className="flex items-center text-white/80">
                <Globe className="w-4 h-4 ml-2" />
                <select className="bg-transparent text-sm font-arabic outline-none">
                  <option value="ar" className="text-dark-900">عربي</option>
                  <option value="en" className="text-dark-900">English</option>
                  <option value="he" className="text-dark-900">עברית</option>
                </select>
              </div>
              
              <button onClick={toggleTheme} className="text-white/80 hover:text-gold-500 transition-colors flex items-center gap-2">
                <span className="font-arabic text-sm text-white/50">{isLightTheme ? 'الوضع المظلم' : 'الوضع الفاتح'}</span>
                {isLightTheme ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
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
                {link.label}
              </NavLink>
            ))}
            <Link
              to="/create"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 rounded-xl bg-gold-500 text-dark-900 font-arabic font-bold text-center"
            >
              ✨ ابدأ قصتك الآن
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className="block px-4 py-3 rounded-xl text-white/80 font-arabic">
                  لوحة التحكم
                </Link>
                <button onClick={handleLogout} className="block w-full px-4 py-3 rounded-xl text-red-400 font-arabic text-right">
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)} className="block px-4 py-3 rounded-xl border border-gold-500/40 text-gold-500 font-arabic text-center">
                تسجيل الدخول
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
