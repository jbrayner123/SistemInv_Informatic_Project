import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useToast } from '../Toast/ToastContext';
import './ProductForm.css';

const ProductForm = ({ onProductAdded, globalCategories = [], globalUnits = [] }) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    categoria: '',
    unidad_medida: '',
    cantidad: 1,
    stock_minimo: 5,
    precio: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cantidad' || name === 'stock_minimo') {
      const parsedValue = parseInt(value);
      setFormData(prev => ({
        ...prev,
        [name]: isNaN(parsedValue) ? '' : Math.max(0, parsedValue)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const adjustStock = (amount) => {
    setFormData(prev => ({
      ...prev,
      cantidad: Math.max(0, (parseInt(prev.cantidad) || 0) + amount)
    }));
  };

  const adjustStockMinimo = (amount) => {
    setFormData(prev => ({
      ...prev,
      stock_minimo: Math.max(0, (parseInt(prev.stock_minimo) || 0) + amount)
    }));
  };

  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.id || !formData.nombre || !formData.categoria || !formData.unidad_medida) {
      setError("Todos los campos excepto cantidad son requeridos.");
      setLoading(false);
      return;
    }

    try {
      // Parsear precio a float
      const payload = { ...formData, precio: parseFloat(formData.precio) || 0 };
      await api.createProduct(payload);
      addToast(`¡Producto ${formData.nombre} (${formData.id}) registrado exitosamente!`, 'success');
      setFormData({ id: '', nombre: '', categoria: '', unidad_medida: '', cantidad: 1, stock_minimo: 5, precio: 0 });
      setIsExpanded(false); // Cierra el acordeón al guardar
      if (onProductAdded) {
        onProductAdded();
      }
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card product-form-card">
      <div 
        className="accordion-header" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 style={{ margin: 0 }}>Registrar Producto</h3>
        <div className={`accordion-icon ${isExpanded ? 'expanded' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
      </div>
      
      <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
        <div className="accordion-inner">
          {error && <div className="alert error">{error}</div>}

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label htmlFor="id">ID (SKU)</label>
          <input 
            type="text" 
            id="id" 
            name="id" 
            value={formData.id} 
            onChange={handleChange} 
            required 
            placeholder="EJ: HER-001" 
            disabled={loading} 
            style={{ textTransform: 'uppercase' }}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Martillo" disabled={loading}/>
        </div>

        <div className="form-group">
          <label htmlFor="categoria">Categoría</label>
          <select id="categoria" name="categoria" value={formData.categoria} onChange={handleChange} required disabled={loading}>
            <option value="">Selecciona...</option>
            {globalCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="unidad_medida">Unidad de Medida</label>
          <select id="unidad_medida" name="unidad_medida" value={formData.unidad_medida} onChange={handleChange} required disabled={loading}>
            <option value="">Selecciona...</option>
            {globalUnits.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>


        <div className="form-group">
          <label htmlFor="precio">Precio Unitario ($)</label>
          <input type="number" step="1" min="0" id="precio" name="precio" value={formData.precio} onChange={handleChange} required placeholder="Ej: 5000" disabled={loading}/>
        </div>

        <div className="form-group stock-form-group">
          <label htmlFor="stock_minimo">Stock Mínimo (Alerta)</label>
          <div className="custom-number-input">
            <button 
              type="button" 
              className="qty-btn minus" 
              onClick={() => adjustStockMinimo(-1)}
              disabled={loading || formData.stock_minimo <= 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <input 
              type="number" 
              id="stock_minimo" 
              name="stock_minimo" 
              value={formData.stock_minimo} 
              onChange={handleChange} 
              min="0" 
              required 
              disabled={loading}
              className="qty-input"
              title="Cuándo debe notificar"
            />
            <button 
              type="button" 
              className="qty-btn plus" 
              onClick={() => adjustStockMinimo(1)}
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>

        <div className="form-group stock-form-group">
          <label htmlFor="cantidad">Stock Inicial</label>
          <div className="custom-number-input">
            <button 
              type="button" 
              className="qty-btn minus" 
              onClick={() => adjustStock(-1)}
              disabled={loading || formData.cantidad <= 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <input 
              type="number" 
              id="cantidad" 
              name="cantidad" 
              value={formData.cantidad} 
              onChange={handleChange} 
              min="0" 
              required 
              disabled={loading}
              className="qty-input"
            />
            <button 
              type="button" 
              className="qty-btn plus" 
              onClick={() => adjustStock(1)}
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Registrar Producto'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
