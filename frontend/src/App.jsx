import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar/Navbar';
import ProductForm from './components/ProductForm/ProductForm';
import InventoryTable from './components/InventoryTable/InventoryTable';
import { ToastProvider } from './components/Toast/ToastContext';
import DashboardResumen from './components/DashboardResumen/DashboardResumen';
import { api } from './api/api';
import './App.css';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
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

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const fetchProducts = async () => {
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
    fetchProducts();
  }, []);

  return (
    <ToastProvider>
      <div className="app-wrapper">
        <Navbar toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
        
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
            <section className="form-section">
              <ProductForm onProductAdded={fetchProducts} />
            </section>
            
            <section className="table-section">
              <InventoryTable 
                products={products} 
                onStockUpdated={fetchProducts}
                loading={loading}
                error={error}
              />
            </section>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;
