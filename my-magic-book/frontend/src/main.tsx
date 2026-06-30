import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Self-host the brand font so the header always renders in Cinzel Decorative,
// even if Google Fonts is slow or blocked (no CDN dependency).
import '@fontsource/cinzel-decorative/700.css';
import '@fontsource/cinzel-decorative/900.css';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { StoryProgressProvider } from './context/StoryProgressContext.tsx';
import './i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StoryProgressProvider>
          <App />
        </StoryProgressProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
