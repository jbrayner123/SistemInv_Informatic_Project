import React, { useState } from 'react';
import { api } from '../../api/api';
import { useToast } from '../Toast/ToastContext';
import './ProductForm.css';

const ProductForm = ({ onProductAdded }) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    categoria: '',
    unidad_medida: '',
    cantidad: 1,
    stock_minimo: 5 /* Valor por defecto recomendado */
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
      await api.createProduct(formData);
      addToast(`¡Producto ${formData.nombre} (${formData.id}) registrado exitosamente!`, 'success');
      setFormData({ id: '', nombre: '', categoria: '', unidad_medida: '', cantidad: 1, stock_minimo: 5 });
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
      <h3>Registrar Producto</h3>
      
      {error && <div className="alert error">{error}</div>}

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label htmlFor="id">ID (SKU)</label>
          <input type="text" id="id" name="id" value={formData.id} onChange={handleChange} required placeholder="EJ: HER-001" disabled={loading} />
        </div>
        
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Martillo" disabled={loading}/>
        </div>

        <div className="form-group">
          <label htmlFor="categoria">Categoría</label>
          <select id="categoria" name="categoria" value={formData.categoria} onChange={handleChange} required disabled={loading}>
            <option value="">Selecciona...</option>
            <option value="Manuales">Manuales</option>
            <option value="Eléctricas">Eléctricas</option>
            <option value="Construcción">Construcción</option>
            <option value="Plomería">Plomería</option>
            <option value="Electricidad">Electricidad</option>
            <option value="Pinturas">Pinturas</option>
            <option value="Tornillería">Tornillería</option>
            <option value="Seguridad">Seguridad</option>
            <option value="Otros">Otros</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="unidad_medida">Unidad de Medida</label>
          <select id="unidad_medida" name="unidad_medida" value={formData.unidad_medida} onChange={handleChange} required disabled={loading}>
            <option value="">Selecciona...</option>
            <option value="Pieza">Pieza (pz)</option>
            <option value="Caja">Caja</option>
            <option value="Metro">Metro (m)</option>
            <option value="Litro">Litro (L)</option>
            <option value="Kilogramo">Kilogramo (kg)</option>
            <option value="Galón">Galón</option>
            <option value="Bolsa">Bolsa</option>
            <option value="Paquete">Paquete</option>
            <option value="Rollo">Rollo</option>
            <option value="Par">Par</option>
            <option value="Set/Juego">Set/Juego</option>
          </select>
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
  );
};

export default ProductForm;
