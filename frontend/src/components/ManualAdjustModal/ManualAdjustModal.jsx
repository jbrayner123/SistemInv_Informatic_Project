import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useToast } from '../Toast/ToastContext';
import './ManualAdjustModal.css';

const ManualAdjustModal = ({ isOpen, product, onClose, onAdjusted }) => {
  const { addToast } = useToast();
  const [cantidadNueva, setCantidadNueva] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (product) {
      setCantidadNueva(product.cantidad);
      setError(null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const adjustValue = (amount) => {
    setCantidadNueva(prev => Math.max(0, (parseInt(prev) || 0) + amount));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseInt(cantidadNueva);
    if (isNaN(parsed) || parsed < 0) {
      setError('La cantidad debe ser un número entero mayor o igual a 0.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.adjustStock(product.id, parsed);
      addToast(`Stock de "${product.nombre}" ajustado: ${product.cantidad} → ${parsed} unidades.`, 'success');
      if (onAdjusted) onAdjusted();
      onClose();
    } catch (err) {
      setError(err.message);
      addToast(`Error al ajustar: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const diff = parseInt(cantidadNueva) - product.cantidad;
  const diffText = isNaN(diff) ? '' : diff > 0 ? `+${diff}` : `${diff}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card adjust-modal" onClick={e => e.stopPropagation()}>
        <h3>Ajuste Manual de Stock</h3>
        <p className="modal-subtitle">Producto: <strong>{product.nombre}</strong> ({product.id})</p>

        <div className="adjust-warning">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Esta acción <strong>sobrescribirá</strong> el stock actual. Úsela solo para correcciones de conteo físico.</span>
        </div>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleSubmit} className="adjust-form">
          <div className="adjust-comparison">
            <div className="adjust-col">
              <span className="adjust-label">Stock Actual</span>
              <span className="adjust-current">{product.cantidad}</span>
            </div>
            <div className="adjust-arrow">→</div>
            <div className="adjust-col">
              <span className="adjust-label">Nuevo Stock</span>
              <div className="stock-control-group">
                <button
                  type="button"
                  className="btn-stock btn-out"
                  onClick={() => adjustValue(-1)}
                  disabled={loading || parseInt(cantidadNueva) <= 0}
                  title="Restar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <input
                  type="number"
                  className="stock-input-premium"
                  value={cantidadNueva}
                  onChange={e => setCantidadNueva(e.target.value)}
                  min="0"
                  required
                  autoFocus
                  disabled={loading}
                />
                <button
                  type="button"
                  className="btn-stock btn-in"
                  onClick={() => adjustValue(1)}
                  disabled={loading}
                  title="Sumar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            </div>
            {diffText && (
              <div className={`adjust-diff ${diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-zero'}`}>
                {diffText}
              </div>
            )}
          </div>

          <div className="modal-actions-premium">
            <button type="button" className="btn-premium btn-cancel" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-premium btn-save" disabled={loading}>
              {loading ? 'Aplicando...' : 'Aplicar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualAdjustModal;
