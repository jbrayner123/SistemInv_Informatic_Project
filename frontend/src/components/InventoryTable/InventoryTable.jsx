import React, { useState } from 'react';
import { api } from '../../api/api';
import { useToast } from '../Toast/ToastContext';
import './InventoryTable.css';

const InventoryTable = ({ products, onStockUpdated, loading, error }) => {
  const { addToast } = useToast();
  const [stockUpdateAmount, setStockUpdateAmount] = useState({});
  const [submittingIds, setSubmittingIds] = useState(new Set());
  const [localErrors, setLocalErrors] = useState({});

  const handleStockChange = (id, value) => {
    setStockUpdateAmount(prev => ({
      ...prev,
      [id]: value === '' ? '' : parseInt(value)
    }));
  };

  const handleUpdateStock = async (id) => {
    const amount = stockUpdateAmount[id];
    if (amount === undefined || amount === '' || amount === 0 || isNaN(amount)) return;

    setSubmittingIds(prev => new Set(prev).add(id));
    setLocalErrors(prev => ({ ...prev, [id]: null }));

    try {
      const updatedProduct = await api.updateStock(id, amount);
      setStockUpdateAmount(prev => ({ ...prev, [id]: '' }));
      
      const actionText = amount > 0 ? 'añadieron' : 'restaron';
      addToast(`Se ${actionText} ${Math.abs(amount)} ${updatedProduct.unidad_medida.toLowerCase()} de ${updatedProduct.nombre}.`, 'success');
      
      // Notify if remaining stock is extremely low
      if (updatedProduct.cantidad <= 5) {
        addToast(`⚠️ ALERTA: Quedan solo ${updatedProduct.cantidad} ${updatedProduct.unidad_medida.toLowerCase()} de ${updatedProduct.nombre}.`, 'error');
      }

      if (onStockUpdated) {
        onStockUpdated();
      }
    } catch (err) {
      setLocalErrors(prev => ({ ...prev, [id]: err.message }));
    } finally {
      setSubmittingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  if (loading && products.length === 0) {
    return <div className="loading-state">Cargando inventario...</div>;
  }

  if (error) {
    return <div className="alert error">Error al cargar el inventario: {error}</div>;
  }

  return (
    <div className="card inventory-card">
      <h3>Inventario Actual ({products.length})</h3>
      
      <div className="table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>ID (SKU)</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>U. Medida</th>
              <th>Stock Actual</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">No hay productos registrados.</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id}>
                  <td className="font-mono">{product.id}</td>
                  <td className="font-semibold">{product.nombre}</td>
                  <td><span className="badge category-badge">{product.categoria}</span></td>
                  <td>{product.unidad_medida}</td>
                  <td>
                    <span className={`stock-badge ${product.cantidad > 10 ? 'stock-ok' : product.cantidad > 0 ? 'stock-low' : 'stock-out'}`}>
                      {product.cantidad}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <div className="add-stock-wrapper">
                      <input 
                        type="number" 
                        placeholder="+/-" 
                        value={stockUpdateAmount[product.id] !== undefined ? stockUpdateAmount[product.id] : ''}
                        onChange={(e) => handleStockChange(product.id, e.target.value)}
                        disabled={submittingIds.has(product.id)}
                        className="stock-input"
                      />
                      <button 
                        className="btn-success"
                        onClick={() => handleUpdateStock(product.id)}
                        disabled={submittingIds.has(product.id) || !stockUpdateAmount[product.id] || stockUpdateAmount[product.id] === 0}
                        title="Actualizar Stock"
                      >
                        {submittingIds.has(product.id) ? '...' : '✓'}
                      </button>
                    </div>
                    {localErrors[product.id] && (
                      <div className="local-error">{localErrors[product.id]}</div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;
