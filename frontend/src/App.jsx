import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar/Navbar';
import ProductForm from './components/ProductForm/ProductForm';
import InventoryTable from './components/InventoryTable/InventoryTable';
import { ToastProvider } from './components/Toast/ToastContext';
import { api } from './api/api';
import './App.css';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

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
          <header className="page-header">
          <h1>SistemInv - Resumen del Inventario</h1>
          <p>Gestiona los productos y el stock de tu ferretería en tiempo real.</p>
        </header>

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
