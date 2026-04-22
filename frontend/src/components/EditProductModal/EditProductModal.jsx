import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import './EditProductModal.css';

const EditProductModal = ({ isOpen, onClose, product, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    unidad_medida: '',
    stock_minimo: 5,
    precio: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        setCategories(data.categorias || []);
        setUnits(data.unidades || []);
      } catch (err) {
        console.error("Error cargando configuración", err);
      }
    };
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (product) {
      setFormData({
        nombre: product.nombre || '',
        categoria: product.categoria || '',
        unidad_medida: product.unidad_medida || '',
        stock_minimo: product.stock_minimo !== undefined ? product.stock_minimo : 5,
        precio: product.precio !== undefined ? product.precio : 0
      });
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'stock_minimo') {
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
    try {
      const payload = { ...formData, precio: parseFloat(formData.precio) || 0 };
      await onSave(product.id, payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <h3>Editar Producto</h3>
        <p className="modal-subtitle">ID: <span className="font-mono">{product.id}</span></p>
        
        {error && <div className="alert error mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-group">
            <label htmlFor="edit-nombre">Nombre del Producto</label>
            <div className="input-icon-wrapper">
              <span className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              </span>
              <input
                type="text"
                id="edit-nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: Martillo Truper 16oz"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half-width">
              <label htmlFor="edit-categoria">Categoría</label>
              <div className="input-icon-wrapper select-wrapper">
                <span className="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                </span>
                <select
                  id="edit-categoria"
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled hidden>Seleccione categoría</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="select-chevron">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </span>
              </div>
            </div>

            <div className="form-group half-width">
              <label htmlFor="edit-unidad_medida">Unidad</label>
              <div className="input-icon-wrapper select-wrapper">
                <span className="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>
                </span>
                <select
                  id="edit-unidad_medida"
                  name="unidad_medida"
                  value={formData.unidad_medida}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled hidden>Unidad</option>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <span className="select-chevron">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </span>
              </div>
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="edit-precio">Precio Unitario de Venta ($)</label>
            <div className="input-icon-wrapper">
              <span className="input-icon" style={{color: '#10B981', fontWeight: 'bold'}}>
                $
              </span>
              <input
                type="number"
                step="1"
                min="0"
                id="edit-precio"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group stock-form-group" style={{maxWidth: '100%', marginBottom: '1.5rem'}}>
            <label htmlFor="edit-stock-minimo">Stock Mínimo (Cuándo notificar escasez)</label>
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
                id="edit-stock-minimo"
                name="stock_minimo"
                value={formData.stock_minimo}
                onChange={handleChange}
                min="0"
                required
                disabled={loading}
                className="qty-input"
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

          <div className="modal-actions-premium">
            <button 
              type="button" 
              className="btn-premium btn-cancel" 
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-premium btn-save"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="spin-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
