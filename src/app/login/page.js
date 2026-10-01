'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Mail, User, ShieldAlert, Loader2, LogIn, ChevronDown } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasClientId, setHasClientId] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showDirectForm, setShowDirectForm] = useState(false);

  // States for the direct Google / email login form
  const [mockName, setMockName] = useState('');
  const [mockEmail, setMockEmail] = useState('');

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Track client ID presence
  useEffect(() => {
    setHasClientId(!!clientId);
  }, [clientId]);

  // Load Google Identity Services SDK safely
  useEffect(() => {
    if (clientId) {
      if (typeof window !== 'undefined' && window.google) {
        setScriptLoaded(true);
        return;
      }
      const existingScript = document.getElementById('google-gsi-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => setScriptLoaded(true));
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setScriptLoaded(true);
      };

      document.body.appendChild(script);
    }
  }, [clientId]);

  // Render Google button once the DOM container is mounted and script is loaded
  useEffect(() => {
    if (hasClientId && scriptLoaded && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleLogin,
          auto_select: false,
          use_fedcm: false,
        });

        const container = document.getElementById('google-btn-container');
        if (container) {
          container.innerHTML = '';
          window.google.accounts.id.renderButton(
            container,
            {
              theme: 'outline',
              size: 'large',
              width: 320,
              text: 'signin_with',
              shape: 'rectangular',
            }
          );
        }

        window.google.accounts.id.prompt();

        // Check after 1.5s if Google button iframe rendered. If not (e.g. unallowed origin on localhost), reveal direct login form automatically
        const timer = setTimeout(() => {
          if (container && !container.querySelector('iframe')) {
            setShowDirectForm(true);
          }
        }, 1500);

        return () => clearTimeout(timer);
      } catch (err) {
        console.error('Error initializing Google Sign-In:', err);
        setShowDirectForm(true);
      }
    }
  }, [hasClientId, scriptLoaded, clientId]);

  // Handle Google authentication token callback
  const handleGoogleLogin = async (response) => {
    setLoading(true);
    setError('');
    try {
      const credential = response.credential;
      
      // Decode profile info
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const payload = JSON.parse(jsonPayload);
      const { name, email, picture } = payload;

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, picture }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          localStorage.setItem('seapac-user-session', JSON.stringify(data.user));
        }
        router.replace('/');
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao realizar login.');
      }
    } catch (err) {
      console.error('Google verification error:', err);
      setError('Falha ao decodificar credenciais do Google.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Direct / Manual Login flow
  const handleMockLogin = async (e) => {
    e?.preventDefault();
    if (!mockName.trim() || !mockEmail.trim()) {
      setError('Por favor, preencha o nome e e-mail.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mockName.trim(),
          email: mockEmail.trim(),
          picture: null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          localStorage.setItem('seapac-user-session', JSON.stringify(data.user));
        }
        router.replace('/');
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao realizar login.');
      }
    } catch (err) {
      console.error('Login request error:', err);
      setError('Falha ao estabelecer conexão de login.');
    } finally {
      setLoading(false);
    }
  };

  const setQuickUser = (name, email) => {
    setMockName(name);
    setMockEmail(email);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        {/* LOGO ICON */}
        <div className="login-logo">
          <Car size={32} />
        </div>

        {/* HEADER SECTION */}
        <div className="login-header">
          <h1>SEAPAC Frota</h1>
          <p>Controle de Viagens & Abastecimento</p>
        </div>

        {/* ERROR MESSAGE DISPLAY */}
        {error && <div className="login-error">{error}</div>}

        {/* GOOGLE SIGN IN CONTAINER */}
        {hasClientId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div className="google-btn-wrapper">
              <div id="google-btn-container" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                {!scriptLoaded && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s infinite linear' }} />
                    <span>Carregando login do Google...</span>
                  </div>
                )}
              </div>
            </div>

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s infinite linear' }} />
                <span>Autenticando...</span>
              </div>
            )}
          </div>
        )}

        {/* TOGGLE DIRECT LOGIN / FORM */}
        {(showDirectForm || !hasClientId) ? (
          <div>
            <form onSubmit={handleMockLogin}>
              <div className="login-form-group">
                <label>Nome Completo</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'rgba(255,255,255,0.5)' }} />
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Ex: Luiz Henrique"
                    value={mockName}
                    onChange={(e) => setMockName(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label>E-mail Autorizado</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'rgba(255,255,255,0.5)' }} />
                  <input
                    type="email"
                    className="login-input"
                    placeholder="Ex: luizhenriquefelix138@gmail.com"
                    value={mockEmail}
                    onChange={(e) => setMockEmail(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Quick Select Preset Email */}
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setQuickUser('Luiz Henrique', 'luizhenriquefelix138@gmail.com')}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  ⚡ Preencher com e-mail de teste (Luiz Henrique ADM)
                </button>
              </div>

              <button type="submit" className="login-btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s infinite linear' }} />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDirectForm(true)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '0.85rem',
              fontWeight: 500,
              padding: '0.65rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              width: '100%',
              transition: 'all 0.2s ease'
            }}
          >
            <span>Entrar diretamente com Nome e E-mail</span>
            <ChevronDown size={16} />
          </button>
        )}

        <div className="divider-container">
          <div className="divider-line" />
          <div className="divider-text">SEAPAC</div>
          <div className="divider-line" />
        </div>

        <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)' }}>
          © 2026 SEAPAC - Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}

