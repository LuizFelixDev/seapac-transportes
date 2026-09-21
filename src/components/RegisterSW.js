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

              // Always check for updates when user opens normal tab
              registration.update();

              // Auto-reload when new version is ready
              registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker) {
                  installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      console.log('[PWA] Nova versão do PWA ativada. Atualizando página...');
                      window.location.reload();
                    }
                  };
                }
              };
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

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  return null;
}

