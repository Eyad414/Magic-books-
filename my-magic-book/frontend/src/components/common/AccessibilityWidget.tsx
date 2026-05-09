import { useState } from 'react';

// Accessibility Widget: Floating button with accessibility options (נגישות)
export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(0); // 0 = normal, 1 = large, 2 = x-large
  const [highContrast, setHighContrast] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [linkHighlight, setLinkHighlight] = useState(false);

  const toggleFontSize = () => {
    const next = (fontSize + 1) % 3;
    setFontSize(next);
    document.documentElement.style.fontSize = next === 0 ? '' : next === 1 ? '120%' : '140%';
  };

  const toggleHighContrast = () => {
    setHighContrast(!highContrast);
    document.documentElement.classList.toggle('high-contrast');
  };

  const toggleGrayscale = () => {
    setGrayscale(!grayscale);
    document.documentElement.style.filter = !grayscale ? 'grayscale(100%)' : '';
  };

  const toggleLinkHighlight = () => {
    setLinkHighlight(!linkHighlight);
    document.documentElement.classList.toggle('highlight-links');
  };

  const resetAll = () => {
    setFontSize(0);
    setHighContrast(false);
    setGrayscale(false);
    setLinkHighlight(false);
    document.documentElement.style.fontSize = '';
    document.documentElement.style.filter = '';
    document.documentElement.classList.remove('high-contrast', 'highlight-links');
  };

  const options = [
    { label: 'تكبير الخط', icon: 'Aa', active: fontSize > 0, onClick: toggleFontSize, desc: fontSize === 0 ? 'عادي' : fontSize === 1 ? 'كبير' : 'كبير جداً' },
    { label: 'تباين عالي', icon: '◐', active: highContrast, onClick: toggleHighContrast, desc: highContrast ? 'مفعّل' : 'معطّل' },
    { label: 'تدرج رمادي', icon: '◑', active: grayscale, onClick: toggleGrayscale, desc: grayscale ? 'مفعّل' : 'معطّل' },
    { label: 'إبراز الروابط', icon: '🔗', active: linkHighlight, onClick: toggleLinkHighlight, desc: linkHighlight ? 'مفعّل' : 'معطّل' },
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-[9999] w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110 border-2 border-white/20"
        aria-label="נגישות — إتاحة الوصول"
        title="נגישות — إتاحة الوصول"
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="4.5" r="2.5" fill="currentColor" stroke="none" />
          <path d="M12 7.5V14" />
          <path d="M7 10.5L12 9L17 10.5" />
          <path d="M9 20L12 14L15 20" />
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 z-[9999] w-72 rounded-2xl bg-dark-800 border border-white/10 shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 bg-blue-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="4.5" r="2.5" fill="currentColor" stroke="none" />
                <path d="M12 7.5V14" />
                <path d="M7 10.5L12 9L17 10.5" />
                <path d="M9 20L12 14L15 20" />
              </svg>
              <span className="font-arabic font-bold text-white text-sm">נגישות — إتاحة الوصول</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white text-lg">✕</button>
          </div>

          {/* Options */}
          <div className="p-3 space-y-2">
            {options.map((opt) => (
              <button
                key={opt.label}
                onClick={opt.onClick}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right ${
                  opt.active
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-white/10 text-white/60 hover:border-white/30'
                }`}
              >
                <span className="text-xl w-8 text-center flex-shrink-0">{opt.icon}</span>
                <div className="flex-1">
                  <p className="font-arabic font-bold text-sm">{opt.label}</p>
                  <p className="font-arabic text-xs opacity-60">{opt.desc}</p>
                </div>
              </button>
            ))}

            {/* Reset */}
            <button
              onClick={resetAll}
              className="w-full p-2 rounded-xl border border-red-500/20 text-red-400 font-arabic text-xs font-bold hover:bg-red-500/10 transition-all mt-1"
            >
              ↺ إعادة ضبط الكل
            </button>
          </div>
        </div>
      )}
    </>
  );
}
