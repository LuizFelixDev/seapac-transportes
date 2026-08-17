'use client';

import React, { useState, useEffect } from 'react';
import { Car, Mail, User, ShieldAlert, Loader2 } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasClientId, setHasClientId] = useState(false);
  
  // States for the simulated Google Sign-in form (fallback)
  const [mockName, setMockName] = useState('');
  const [mockEmail, setMockEmail] = useState('');

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Initialize and load Google Identity Services SDK
  useEffect(() => {
    setHasClientId(!!clientId);

    if (clientId) {
      // Create and append the Google client SDK script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.google) {
          try {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: handleGoogleLogin,
              auto_select: false,
            });

            window.google.accounts.id.renderButton(
              document.getElementById('google-btn-container'),
              {
                theme: 'outline',
                size: 'large',
                width: '100%',
                text: 'signin_with',
                shape: 'rectangular',
              }
            );

            // Optional: Display One Tap prompt
            window.google.accounts.id.prompt();
          } catch (err) {
            console.error('Error initializing Google One Tap:', err);
          }
        }
      };

      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [clientId]);

  // Handle Google authenticaton token callback
  const handleGoogleLogin = async (response) => {
    setLoading(true);
    setError('');
    try {
      const credential = response.credential;
      
      // Decode the profile information from the JWT credential payload
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

      // Submit session details to backend cookie handler
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, picture }),
      });

      if (res.ok) {
        window.location.href = '/';
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

  // Handle Simulated/Mock Google Login flow
  const handleMockLogin = async (e) => {
    e.preventDefault();
    if (!mockName.trim() || !mockEmail.trim()) {
      setError('Por favor, preencha o nome e email.');
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
        window.location.href = '/';
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao realizar login de demonstração.');
      }
    } catch (err) {
      console.error('Mock login request error:', err);
      setError('Falha ao estabelecer conexão de login.');
    } finally {
      setLoading(false);
    }
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

        {/* GOOGLE SIGN IN BUTTON */}
        {hasClientId ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="google-btn-wrapper">
              <div id="google-btn-container" style={{ width: '100%' }}></div>
            </div>
            
            {/* Loading Indicator */}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s infinite linear' }} />
                <span>Autenticando...</span>
              </div>
            )}
          </div>
        ) : (
          /* FALLBACK SIMULATION IN DEV ENVIRONMENT */
          <div>
            <div className="demo-alert">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Modo de Demonstração Ativo</strong>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: 'rgba(255,255,255,0.8)' }}>
                    Para usar login real do Google, defina a variável <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> no arquivo <code>.env.local</code>.
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleMockLogin}>
              <div className="login-form-group">
                <label>Nome Completo</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'rgba(255,255,255,0.5)' }} />
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Ex: Francisco Silva"
                    value={mockName}
                    onChange={(e) => setMockName(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label>E-mail do Google</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'rgba(255,255,255,0.5)' }} />
                  <input
                    type="email"
                    className="login-input"
                    placeholder="Ex: motorista@seapac.org"
                    value={mockEmail}
                    onChange={(e) => setMockEmail(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button type="submit" className="login-btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s infinite linear' }} />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <span>Simular Entrada com Google</span>
                )}
              </button>
            </form>
          </div>
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
