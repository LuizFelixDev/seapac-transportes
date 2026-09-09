'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download, Info } from 'lucide-react';

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showTip, setShowTip] = useState(false);
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
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      window.addEventListener('appinstalled', () => {
        setDeferredPrompt(null);
        setIsStandalone(true);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowTip(!showTip);
    }
  };

  if (isStandalone) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={handleInstallClick}
        className="btn pwa-install-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.78rem',
          fontWeight: 700,
          padding: '0.35rem 0.75rem',
          height: '34px',
          borderRadius: '10px',
          cursor: 'pointer',
          backgroundColor: 'hsl(var(--primary))',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 2px 8px rgba(var(--primary-rgb), 0.3)',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap'
        }}
        title="Instalar aplicativo SEAPAC no celular/computador"
      >
        <Smartphone size={16} />
        <span>Baixar App</span>
      </button>

      {showTip && (
        <div 
          className="glass"
          style={{
            position: 'absolute',
            top: '120%',
            right: 0,
            zIndex: 9999,
            width: '290px',
            backgroundColor: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--primary))',
            borderRadius: '14px',
            padding: '1rem',
            boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
            fontSize: '0.8rem',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <strong style={{ color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
              <Download size={16} /> Instalar Aplicativo
            </strong>
            <button 
              onClick={() => setShowTip(false)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))' }}
            >
              <X size={16} />
            </button>
          </div>

          {isIOS ? (
            <div>
              <p style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'hsl(var(--foreground))' }}>No iPhone / iPad (Safari):</p>
              <ol style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 1.5, color: 'hsl(var(--muted-foreground))' }}>
                <li>Toque no ícone <strong>Compartilhar</strong> (quadrado com seta pra cima no menu).</li>
                <li>Role e selecione <strong>Adicionar à Tela de Início</strong>.</li>
              </ol>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'hsl(var(--foreground))' }}>No Android / Chrome / Navegador:</p>
              <ol style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 1.5, color: 'hsl(var(--muted-foreground))' }}>
                <li>Toque nos <strong>3 pontinhos (⋮)</strong> no canto superior direito do navegador.</li>
                <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
