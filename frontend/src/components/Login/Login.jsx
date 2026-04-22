import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  
  // 'login' | 'forgot' | 'reset'
  const [view, setView] = useState('login');
  
  // Reset token flow form
  const [resetForm, setResetForm] = useState({ username: '', token: '', new_password: '' });
  const [resetSuccess, setResetSuccess] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError('Completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      await login(form);
    } catch (err) {
      setError(err.message || 'Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!resetForm.username.trim()) {
      setError('Por favor, ingresa tu usuario.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { api } = await import('../../api/api');
      const res = await api.forgotPassword(resetForm.username);
      setResetSuccess(res.message);
      setView('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetForm.username.trim() || !resetForm.token.trim() || !resetForm.new_password.trim()) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { api } = await import('../../api/api');
      const res = await api.resetPassword(resetForm);
      setResetSuccess(res.message);
      setView('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-root">
      {/* Panel izquierdo — Branding */}
      <aside className="login-panel-brand">
        <div className="brand-content">
          <div className="brand-icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" opacity=".9"/>
            </svg>
          </div>
          <h1 className="brand-name">SistemInv</h1>
          <p className="brand-tagline">Gestión de inventario<br/>para ferretería.</p>
        </div>
      </aside>

      {/* Panel derecho — Formulario */}
      <main className="login-panel-form">
        <button
          className="login-theme-btn"
          onClick={() => setIsDark((p) => !p)}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
          {isDark ? 'Modo claro' : 'Modo oscuro'}
        </button>

        <div className="form-wrapper">
          {view === 'login' && (
            <>
              <div className="form-header">
                <h2>Iniciar sesión</h2>
                <p>Ingresa tus credenciales para acceder al sistema.</p>
                {resetSuccess && <p className="form-success" style={{ color: 'var(--success)' }}>{resetSuccess}</p>}
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label htmlFor="username">Usuario</label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="nombre de usuario"
                    value={form.username}
                    onChange={handleChange}
                    autoComplete="username"
                    autoFocus
                    disabled={loading}
                    className={error ? 'input-error-state' : ''}
                    style={{ textTransform: 'lowercase' }}
                  />
                </div>

                <div className="field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="password">Contraseña</label>
                    <button 
                      type="button" 
                      onClick={() => { setView('forgot'); setError(''); setResetSuccess(''); }}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500' }}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="password-wrapper">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      disabled={loading}
                      className={error ? 'input-error-state' : ''}
                    />
                    <button
                      type="button"
                      className="eye-toggle"
                      onClick={() => setShowPassword((p) => !p)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="form-error" role="alert">{error}</p>
                )}

                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? (
                    <svg className="spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
                    </svg>
                  ) : null}
                  {loading ? 'Verificando...' : 'Acceder'}
                </button>
              </form>
            </>
          )}

          {view === 'forgot' && (
            <>
              <div className="form-header">
                <h2>¿Olvidaste tu contraseña?</h2>
                <p>Ingresa tu usuario y te enviaremos un PIN de restablecimiento al correo del administrador.</p>
              </div>

              <form onSubmit={handleForgotSubmit} noValidate>
                <div className="field">
                  <label htmlFor="reset-username">Usuario</label>
                  <input
                    id="reset-username"
                    name="username"
                    type="text"
                    placeholder="Tu usuario"
                    value={resetForm.username}
                    onChange={(e) => { setResetForm({...resetForm, username: e.target.value}); setError(''); }}
                    autoComplete="username"
                    autoFocus
                    disabled={loading}
                    className={error ? 'input-error-state' : ''}
                    style={{ textTransform: 'lowercase' }}
                  />
                </div>

                {error && (
                  <p className="form-error" role="alert">{error}</p>
                )}

                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Enviando...' : 'Solicitar PIN temporal'}
                </button>

                <button 
                  type="button" 
                  className="btn-back" 
                  onClick={() => { setView('login'); setError(''); }}
                  style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: 'var(--surface)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', fontWeight: '500' }}
                >
                  Regresar a Iniciar sesión
                </button>
              </form>
            </>
          )}

          {view === 'reset' && (
            <>
              <div className="form-header">
                <h2>Ingresar PIN temporal</h2>
                <p>Se ha generado el PIN para {resetForm.username}. Solicítalo al administrador.</p>
                {resetSuccess && <p className="form-success" style={{ color: 'var(--primary)', marginTop: '0.5rem', fontWeight: '500' }}>{resetSuccess}</p>}
              </div>

              <form onSubmit={handleResetSubmit} noValidate>
                <div className="field">
                  <label htmlFor="reset-token">PIN de 6 Caracteres</label>
                  <input
                    id="reset-token"
                    name="token"
                    type="text"
                    placeholder="XXXXXX"
                    value={resetForm.token}
                    onChange={(e) => { setResetForm({...resetForm, token: e.target.value}); setError(''); }}
                    disabled={loading}
                    style={{ textTransform: 'uppercase', letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                    autoComplete="off"
                  />
                </div>

                <div className="field">
                  <label htmlFor="new-password">Nueva Contraseña</label>
                  <input
                    id="new-password"
                    name="new_password"
                    type="password"
                    placeholder="••••••••"
                    value={resetForm.new_password}
                    onChange={(e) => { setResetForm({...resetForm, new_password: e.target.value}); setError(''); }}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <p className="form-error" role="alert">{error}</p>
                )}

                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Cambiando...' : 'Restablecer contraseña'}
                </button>
                
                <button 
                  type="button" 
                  onClick={() => { setView('login'); setError(''); setResetSuccess(''); }}
                  style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: '500' }}
                >
                  Cancelar
                </button>
              </form>
            </>
          )}

        </div>

      </main>
    </div>
  );
};

export default Login;