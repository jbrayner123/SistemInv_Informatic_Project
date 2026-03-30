import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast/ToastContext';
import Navbar from './components/Navbar/Navbar';
import Login from './components/Login/Login';
import ProductForm from './components/ProductForm/ProductForm';
import InventoryTable from './components/InventoryTable/InventoryTable';
import DashboardResumen from './components/DashboardResumen/DashboardResumen';
import InventoryFilterBar from './components/InventoryFilterBar/InventoryFilterBar';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
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
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // ─── Filtros del InventoryFilterBar ──────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const uniqueCategories = useMemo(() => {
    return [...new Set(products.map(p => p.categoria))].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term || 
        p.nombre.toLowerCase().includes(term) || 
        p.id.toLowerCase().includes(term);

      const matchesCategory = categoryFilter === 'ALL' || p.categoria === categoryFilter;

      let matchesStatus = true;
      if (statusFilter === 'OUT') {
        matchesStatus = p.cantidad === 0;
      } else if (statusFilter === 'LOW') {
        const min = p.stock_minimo !== undefined ? p.stock_minimo : 5;
        matchesStatus = p.cantidad > 0 && p.cantidad <= min;
      } else if (statusFilter === 'OK') {
        const min = p.stock_minimo !== undefined ? p.stock_minimo : 5;
        matchesStatus = p.cantidad > min;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, categoryFilter, statusFilter]);

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

  const fetchProducts = async (isBackground = false) => {
    if (!session) return;
    try {
      if (!isBackground) setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
      if (!isBackground) setError(null);
    } catch (err) {
      if (!isBackground) setError(err.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    
    fetchProducts();
    
    const handleInventoryChange = () => fetchProducts(true);
    window.addEventListener('inventory-changed', handleInventoryChange);
    
    const intervalId = setInterval(() => {
      fetchProducts(true);
    }, 1000);

    return () => {
      window.removeEventListener('inventory-changed', handleInventoryChange);
      clearInterval(intervalId);
    };
  }, [session]);

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
        onOpenAdmin={() => setShowAdminPanel(true)}
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
          {rol === 'admin' && (
            <section className="form-section">
              <ProductForm onProductAdded={fetchProducts} />
            </section>
          )}

          <section className="filter-section">
            <InventoryFilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              categories={uniqueCategories}
            />
          </section>

          <section className="table-section">
            <InventoryTable
              products={filteredProducts}
              onStockUpdated={fetchProducts}
              loading={loading}
              error={error}
              rol={rol}
            />
          </section>
        </div>
      </main>

      {/* Panel de Administración — HU-25 */}
      {showAdminPanel && (
        <AdminDashboard onClose={() => setShowAdminPanel(false)} />
      )}
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
