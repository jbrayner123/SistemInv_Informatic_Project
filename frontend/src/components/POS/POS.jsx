import React, { useState, useMemo } from 'react';
import { useToast } from '../Toast/ToastContext';
import { api } from '../../api/api';
import './POS.css';

const POS = ({ products, onSaleComplete, allCategories = [] }) => {
  const { addToast } = useToast();
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'cart'

  // Filtros de categoría
  const [selectedCategory, setSelectedCategory] = useState("TODOS");

  const uniqueCategories = useMemo(() => {
    // Tomamos las pre-calculadas que vienen desde App.jsx para asegurar que
    // se muestren las vacías configuradas desde ajustes.
    return ["TODOS", ...allCategories];
  }, [allCategories]);

  // Filtramos productos por término, categoría y excluimos los agotados
  const availableProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === "TODOS" || p.categoria === selectedCategory;
      return matchSearch && matchCat && p.cantidad > 0;
    });
  }, [products, searchTerm, selectedCategory]);

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        const newTotal = existing.qty + quantity;
        if (newTotal > product.cantidad) {
          addToast(`No hay suficiente stock. Máximo disponible: ${product.cantidad}`, "error");
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: newTotal } : item);
      }
      return [...prev, { ...product, qty: quantity }];
    });
    addToast(`${quantity} ${product.nombre} agregados al carrito`, "success");
  };

  const handleProductCardClick = (product) => {
    if (product.cantidad === 0) {
      addToast("Producto sin stock disponible", "error");
      return;
    }

    // Si solo queda 1, lo agregamos directo (UX optimizada)
    if (product.cantidad === 1) {
      addToCart(product, 1);
      return;
    }

    // Si ya está seleccionado, lo deseleccionamos (toggle)
    if (selectedProduct?.id === product.id) {
      setSelectedProduct(null);
      return;
    }
    setSelectedProduct(product);
    setModalQty(1); // Empezar en 1 por defecto al abrir
  };

  const confirmAddToCart = () => {
    if (!selectedProduct || modalQty <= 0) return;
    if (modalQty > selectedProduct.cantidad) {
      addToast(`Solo hay ${selectedProduct.cantidad} unidades disponibles.`, "error");
      return;
    }
    addToCart(selectedProduct, modalQty);
    setSelectedProduct(null);
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.qty + delta;
        const productMetadata = products.find(p => p.id === productId);
        if (newQty > 0 && newQty <= (productMetadata?.cantidad || 0)) {
          return { ...item, qty: newQty };
        }
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.precio || 10.0) * item.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    
    try {
      const formattedItems = cart.map(item => ({
        id: item.id,
        nombre: item.nombre,
        qty: item.qty,
        precio: item.precio || 10.0
      }));

      await api.checkoutPOS(formattedItems, cartTotal);

      setCart([]);
      if (onSaleComplete) onSaleComplete();
      addToast("¡Venta completada y stock descontado!", "success");
    } catch (error) {
      console.error(error);
      addToast(`Error procesando la venta: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="pos-container">
      {/* NAVEGACIÓN MÓVIL (TABS) */}
      <div className="pos-mobile-nav">
        <button 
          className={`pos-nav-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          Catálogo
        </button>
        <button 
          className={`pos-nav-btn ${activeTab === 'cart' ? 'active' : ''}`}
          onClick={() => setActiveTab('cart')}
        >
          <div className="cart-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            {totalItems > 0 && <span className="cart-dot">{totalItems}</span>}
          </div>
          Carrito
        </button>
      </div>

      {/* SECCIÓN IZQUIERDA: Buscador y Catálogo */}
      <div className={`pos-catalog ${activeTab === 'catalog' ? 'tab-visible' : 'tab-hidden'}`}>
        <div className="pos-header">
          <h2>Punto de Venta</h2>
          <div className="pos-search-wrapper">
            <svg className="sea-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Buscar por ID o Nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pos-search-input"
              style={{ textTransform: 'uppercase' }}
            />
          </div>
        </div>

        {/* Filtros Rápidos (Pills) */}
        <div className="pos-category-pills">
          {uniqueCategories.map(cat => (
            <button 
              key={cat} 
              className={`pos-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="pos-grid">
          {availableProducts.map(product => {
            const isActive = selectedProduct?.id === product.id;
            
            return (
              <div key={product.id} className={`pos-card ${isActive ? 'card-active' : ''}`}>
                <div className="pos-card-content" onClick={() => handleProductCardClick(product)}>
                  <span className="pos-sku">{product.id}</span>
                  <h3 className="pos-name">{product.nombre}</h3>
                  <div className="pos-card-footer">
                    <span className="pos-price">${(product.precio || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                    {(() => {
                      const min = product.stock_minimo !== undefined ? product.stock_minimo : 5;
                      const isLow = product.cantidad <= min;
                      return (
                        <span className={`pos-stock ${isLow ? 'stock-low' : 'stock-ok'}`}>
                          Disp: {product.cantidad}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* OVERLAY DE CANTIDAD INTERNO (DISCRETO) */}
                {isActive && (
                  <div className="pos-card-qty-selector">
                    <div className="qty-selector-inner">
                      <p className="qty-label">Cantidad:</p>
                      <div className="qty-controls-row">
                        <button 
                          className="qty-mini-btn" 
                          onClick={() => setModalQty(q => Math.max(0, q - 1))}
                        >-</button>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={modalQty}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            const v = parseInt(val);
                            setModalQty(isNaN(v) ? 0 : Math.min(product.cantidad, Math.max(0, v)));
                          }}
                          className="qty-mini-input"
                          autoFocus
                        />
                        <button 
                          className="qty-mini-btn" 
                          onClick={() => setModalQty(q => Math.min(product.cantidad, q + 1))}
                        >+</button>
                      </div>
                      <div className="qty-actions-row">
                        <button className="qty-action-btn btn-confirm" onClick={confirmAddToCart}>Agregar</button>
                        <button className="qty-action-btn btn-cancel" onClick={() => setSelectedProduct(null)} title="Cerrar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pos-card-overlay" onClick={() => handleProductCardClick(product)}>
                  <span>+ Agregar</span>
                </div>
              </div>
            );
          })}
          {availableProducts.length === 0 && (
            <div className="pos-empty">No hay productos disponibles.</div>
          )}
        </div>
      </div>

      {/* SECCIÓN DERECHA: Carrito y Checkout */}
      <div className={`pos-cart-sidebar ${activeTab === 'cart' ? 'tab-visible' : 'tab-hidden'}`}>
        <div className="cart-header">
          <h3>Ticket Actual</h3>
          <span className="cart-badge">{cart.length}</span>
        </div>

        <div className="cart-items">
          {cart.map(item => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-info">
                <h4>{item.nombre}</h4>
                <p className="cart-item-sub">${(item.precio || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })} c/u</p>
              </div>
              <div className="cart-item-controls">
                <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                <span>{item.qty}</span>
                <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                <button className="btn-remove-item" onClick={() => removeFromCart(item.id)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="cart-empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-color)" strokeWidth="1"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              <p>El carrito está vacío</p>
            </div>
          )}
        </div>

        <div className="cart-summary">
          <div className="cart-total-row">
            <span>Total a Cobrar</span>
            <span className="cart-total-amount">${cartTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
          </div>
          <button 
            className={`btn-checkout ${cart.length === 0 ? 'disabled' : ''} ${isProcessing ? 'processing' : ''}`}
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
          >
            {isProcessing ? 'Procesando...' : 'Completar Venta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POS;
