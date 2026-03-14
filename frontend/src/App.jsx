import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast/ToastContext';
import Navbar from './components/Navbar/Navbar';
import Login from './components/Login/Login';
import ProductForm from './components/ProductForm/ProductForm';
import InventoryTable from './components/InventoryTable/InventoryTable';
import DashboardResumen from './components/DashboardResumen/DashboardResumen';
import { api } from './api/api';
import './App.css';

// ─── Inner shell (requires AuthContext to be mounted above) ───────────────────
function AppShell() {
  const { session, logout } = useAuth();

  const [isDarkMode, setIsDarkMode] = useState(() =>
    localStorage.getItem('theme') === 'dark'
  );
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const fetchProducts = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchProducts();
  }, [session]);

  // Sin sesión → solo renderizar Login
  if (!session) {
    return <Login />;
  }

  const rol = session.rol;

  return (
    <div className="app-wrapper">
      <Navbar
        toggleDarkMode={() => setIsDarkMode((p) => !p)}
        isDarkMode={isDarkMode}
        username={session.nombre_completo}
        rol={rol}
        onLogout={logout}
      />

      <main className="main-content">
        <header className="page-header premium-header">
          <div className="header-brand">
            <div className="brand-logo">
              <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="url(#brandGradient)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div className="header-text">
              <h1>SistemInv</h1>
              <p>Gestiona los productos y el stock de tu ferretería en tiempo real.</p>
            </div>
          </div>
        </header>

        <section className="dashboard-summary-section">
          <DashboardResumen products={products} />
        </section>

        <div className="dashboard-grid">
          {/* El formulario de creación solo es visible para admin */}
          {rol === 'admin' && (
            <section className="form-section">
              <ProductForm onProductAdded={fetchProducts} />
            </section>
          )}

          <section className="table-section">
            <InventoryTable
              products={products}
              onStockUpdated={fetchProducts}
              loading={loading}
              error={error}
              rol={rol}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
