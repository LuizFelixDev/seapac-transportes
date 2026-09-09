'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download } from 'lucide-react';

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
      
      setIsStandalone(standalone);
      if (standalone) return;

      const userAgent = window.navigator.userAgent.toLowerCase();
      const iosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(iosDevice);

      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      window.addEventListener('appinstalled', () => {
        setIsInstallable(false);
        setDeferredPrompt(null);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSTip(!showIOSTip);
      return;
    }

    if (!deferredPrompt) {
      alert('Para instalar o app, use a opção "Adicionar à tela inicial" no menu do seu navegador.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  if (isStandalone) return null;

  // Show if installable prompt is available OR if on mobile/iOS
  if (!isInstallable && !isIOS) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={handleInstallClick}
        className="btn btn-secondary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          padding: '0.3rem 0.6rem',
          height: '32px',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
        title="Instalar aplicativo SEAPAC no dispositivo"
      >
        <Smartphone size={15} style={{ color: 'hsl(var(--primary))' }} />
        <span>Baixar App</span>
      </button>

      {showIOSTip && (
        <div 
          style={{
            position: 'absolute',
            top: '115%',
            right: 0,
            zIndex: 999,
            width: '260px',
            backgroundColor: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '10px',
            padding: '0.85rem',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
            fontSize: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <strong style={{ color: 'hsl(var(--primary))' }}>Instalar no iPhone / iPad:</strong>
            <button 
              onClick={() => setShowIOSTip(false)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))' }}
            >
              <X size={14} />
            </button>
          </div>
          <ol style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 1.4 }}>
            <li>Toque no ícone <strong>Compartilhar</strong> no Safari.</li>
            <li>Selecione <strong>Adicionar à Tela de Início</strong>.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
