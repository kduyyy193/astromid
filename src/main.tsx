import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        theme="dark"
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: 'font-sans border border-white/10 bg-[#141414] text-white shadow-xl',
            title: 'text-sm',
            description: 'text-white/80',
            error: 'text-red-400',
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
);
