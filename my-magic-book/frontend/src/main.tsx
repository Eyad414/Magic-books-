import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
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
