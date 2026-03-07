import React, { useState } from 'react';
import { api } from '../../api/api';
import './InventoryTable.css';

const InventoryTable = ({ products, onStockUpdated, loading, error }) => {
  const [stockAddAmount, setStockAddAmount] = useState({});
  const [submittingIds, setSubmittingIds] = useState(new Set());
  const [localErrors, setLocalErrors] = useState({});

  const handleStockChange = (id, value) => {
    setStockAddAmount(prev => ({
      ...prev,
      [id]: parseInt(value) || ''
    }));
  };

  const handleAddStock = async (id) => {
    const amount = stockAddAmount[id];
    if (!amount || amount <= 0) return;

    setSubmittingIds(prev => new Set(prev).add(id));
    setLocalErrors(prev => ({ ...prev, [id]: null }));

    try {
      await api.addStock(id, amount);
      setStockAddAmount(prev => ({ ...prev, [id]: '' }));
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
      <h3>📊 Inventario Actual ({products.length})</h3>
      
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
                        min="1"
                        placeholder="+0" 
                        value={stockAddAmount[product.id] || ''}
                        onChange={(e) => handleStockChange(product.id, e.target.value)}
                        disabled={submittingIds.has(product.id)}
                        className="stock-input"
                      />
                      <button 
                        className="btn-success"
                        onClick={() => handleAddStock(product.id)}
                        disabled={submittingIds.has(product.id) || !stockAddAmount[product.id]}
                        title="Sumar Stock"
                      >
                        {submittingIds.has(product.id) ? '...' : '+'}
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
