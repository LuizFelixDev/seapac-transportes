'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Capture beforeinstallprompt event globally before any component state loss
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        window.deferredInstallPrompt = e;
        console.log('[PWA] Prompt de instalação PWA capturado com sucesso.');
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // 2. Register Service Worker immediately if document is already loaded
      if ('serviceWorker' in navigator) {
        const doRegister = () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
              console.log('[PWA] Service Worker registrado com sucesso no escopo:', registration.scope);
            })
            .catch((error) => {
              console.error('[PWA] Erro ao registrar Service Worker:', error);
            });
        };

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          doRegister();
        } else {
          window.addEventListener('load', doRegister);
        }
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  return null;
}
