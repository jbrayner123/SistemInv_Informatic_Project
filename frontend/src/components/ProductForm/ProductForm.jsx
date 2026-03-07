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
    cantidad: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cantidad' ? parseInt(value) || 0 : value
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
      setFormData({ id: '', nombre: '', categoria: '', unidad_medida: '', cantidad: 0 });
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
      <h3>➕ Registrar Producto</h3>
      
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
            <option value="Herramientas">Herramientas</option>
            <option value="Materiales">Materiales</option>
            <option value="Fijación">Fijación</option>
            <option value="Pinturas">Pinturas</option>
            <option value="Otros">Otros</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="unidad_medida">Unidad de Medida</label>
          <select id="unidad_medida" name="unidad_medida" value={formData.unidad_medida} onChange={handleChange} required disabled={loading}>
            <option value="">Selecciona...</option>
            <option value="Unidad">Unidad</option>
            <option value="Kg">Kilogramos (Kg)</option>
            <option value="Metro">Metros (m)</option>
            <option value="Litro">Litros (L)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="cantidad">Stock Inicial</label>
          <input type="number" id="cantidad" name="cantidad" value={formData.cantidad} onChange={handleChange} min="0" required disabled={loading}/>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : 'Registrar Producto'}
        </button>
      </form>
    </div>
  );
};

export default ProductForm;
