import React from 'react';
import './ProductDetailModal.css';

const ProductDetailModal = ({ isOpen, product, onClose }) => {
  if (!isOpen || !product) return null;

  const threshold = product.stock_minimo !== undefined ? product.stock_minimo : 5;
  let estado = 'Óptimo';
  let estadoClass = 'status-ok';
  if (product.cantidad === 0) {
    estado = 'Agotado';
    estadoClass = 'status-out';
  } else if (product.cantidad <= threshold) {
    estado = 'Alerta / Stock Bajo';
    estadoClass = 'status-low';
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card detail-modal" onClick={e => e.stopPropagation()}>
        <div className="detail-header">
          <h3>Detalle del Producto</h3>
          <button className="detail-close-btn" onClick={onClose} title="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-label">ID (SKU)</span>
            <span className="detail-value font-mono">{product.id}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Nombre</span>
            <span className="detail-value">{product.nombre}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Categoría</span>
            <span className="detail-value">
              <span className="badge category-badge">{product.categoria}</span>
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Unidad de Medida</span>
            <span className="detail-value">{product.unidad_medida}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Stock Actual</span>
            <span className={`detail-value detail-stock ${estadoClass}`}>{product.cantidad}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Stock Mínimo</span>
            <span className="detail-value">{threshold}</span>
          </div>
          <div className="detail-field full-width">
            <span className="detail-label">Estado</span>
            <span className={`detail-value detail-status ${estadoClass}`}>{estado}</span>
          </div>
        </div>

        <div className="detail-footer">
          <button className="btn-premium btn-cancel" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
