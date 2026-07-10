import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Mail, Phone, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const location = useLocation();
  const { t } = useTranslation();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    const [path, hash] = to.split('#');
    if (location.pathname === path) {
      if (hash) {
        const element = document.getElementById(hash);
        if (element) {
          e.preventDefault();
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="relative z-10 border-t border-white/10 bg-dark-900/80 backdrop-blur-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center drop-shadow-[0_0_10px_rgba(212,169,55,0.6)]">
                <img src="/logo.png" alt="Magic Fanoos" className="w-full h-full object-contain" />
              </div>
              <span className="font-arabic font-bold text-gold-500 text-lg">{t('nav.home_brand')}</span>
            </div>
            <p className="text-white/50 text-sm font-arabic leading-relaxed">
              {t('footer.description')}
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="https://www.instagram.com/magicfanoos" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-gold-500 hover:border-gold-500/40 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="https://wa.me/972585502072" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-gold-500 hover:border-gold-500/40 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12.031 0C5.385 0 0 5.387 0 12.035c0 2.128.555 4.195 1.611 6.014L.43 23.491l5.584-1.465a12.028 12.028 0 0 0 6.017 1.609c6.645 0 12.033-5.387 12.033-12.035C24.062 5.387 18.675 0 12.031 0zm6.657 17.335c-.282.8-1.503 1.517-2.072 1.583-.54.063-1.229.176-3.874-.922-3.197-1.328-5.263-4.606-5.421-4.818-.158-.212-1.294-1.724-1.294-3.288 0-1.564.813-2.339 1.107-2.657.294-.317.641-.397.853-.397.212 0 .423.003.606.012.2.009.467-.078.732.559.282.68 1.011 2.464 1.1 2.65.088.187.147.404.041.616-.106.213-.159.345-.317.532-.158.188-.335.405-.482.559-.158.165-.328.347-.147.658.182.311.813 1.341 1.745 2.17.12.115.356.24.605.341.25.101.554.091.764-.138.21-.232.898-1.045 1.144-1.405.247-.361.493-.3.846-.17.353.13 2.235 1.053 2.617 1.244.382.19.636.284.73.444.094.16.094.928-.188 1.728z" />
                </svg>
              </a>
              <a href="https://tiktok.com/@mymagicbook.sa" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-gold-500 hover:border-gold-500/40 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
                </svg>
              </a>
              <a href="mailto:magicfanoose@gmail.com" aria-label="Email" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-gold-500 hover:border-gold-500/40 transition-all">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-arabic font-bold text-white mb-4 text-sm">{t('footer.quick_links')}</h3>
            <ul className="space-y-2">
              {[
                { to: '/', label: t('nav.home') },
                { to: '/stories', label: t('nav.stories') },
                { to: '/create', label: t('nav.create_story') },
                { to: '/about', label: t('nav.about') },
              ].map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="text-white/50 text-sm font-arabic hover:text-gold-500 transition-colors"
                    onClick={(e) => handleLinkClick(e, link.to)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-arabic font-bold text-white mb-4 text-sm">{t('footer.legal_title')}</h3>
            <ul className="space-y-2">
              {[
                { to: '/policy', label: t('footer.privacy') },
                { to: '/policy#terms', label: t('footer.terms') },
                { to: '/policy#payment', label: t('footer.payment_policy') },
                { to: '/policy#data-deletion', label: t('footer.data_deletion') },
              ].map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="text-white/50 text-sm font-arabic hover:text-gold-500 transition-colors"
                    onClick={(e) => handleLinkClick(e, link.to)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-arabic font-bold text-white mb-4 text-sm">{t('footer.contact_title')}</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-white/50 text-sm font-arabic">
                <Mail className="w-4 h-4 text-gold-500 flex-shrink-0" />
                <span>magicfanoose@gmail.com</span>
              </li>
              <li className="flex items-center gap-3 text-white/50 text-sm font-arabic">
                <Phone className="w-4 h-4 text-gold-500 flex-shrink-0" />
                <span dir="ltr">+972 58 550 2072</span>
              </li>
              <li className="flex items-center gap-3 text-white/50 text-sm font-arabic">
                <MapPin className="w-4 h-4 text-gold-500 flex-shrink-0" />
                <span>Jerusalem</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-sm font-arabic">
            {t('footer.copyright')}
          </p>
          <p className="text-white/30 text-sm font-arabic flex items-center gap-1">
            {t('footer.made_with')} <Heart className="w-3 h-3 text-gold-500 mx-1 inline" /> {t('footer.for_kids')}
          </p>
        </div>
      </div>
    </footer>
  );
}
