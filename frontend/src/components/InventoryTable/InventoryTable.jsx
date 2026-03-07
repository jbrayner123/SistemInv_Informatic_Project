import React, { useState } from 'react';
import { api } from '../../api/api';
import { useToast } from '../Toast/ToastContext';
import './InventoryTable.css';

const InventoryTable = ({ products, onStockUpdated, loading, error }) => {
  const { addToast } = useToast();
  const [stockUpdateAmount, setStockUpdateAmount] = useState({});
  const [submittingIds, setSubmittingIds] = useState(new Set());
  const [localErrors, setLocalErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const itemsPerPage = 10;

  // Reset to first page when products array length changes significantly
  React.useEffect(() => {
    const totalPages = Math.ceil(products.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [products.length, currentPage]);

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
      if (updatedProduct.cantidad <= 5 && updatedProduct.cantidad > 0) {
        addToast(`ALERTA: Quedan solo ${updatedProduct.cantidad} ${updatedProduct.unidad_medida.toLowerCase()} de ${updatedProduct.nombre}.`, 'error');
      } else if (updatedProduct.cantidad === 0) {
        addToast(`ALERTA: No hay Stock del producto ${updatedProduct.nombre}.`, 'error');
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

  // Sorting logic
  let sortedProducts = [...products];
  if (sortConfig.key) {
    sortedProducts.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Pagination logic
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = sortedProducts.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return <span className="sort-icon inactive">↕</span>;
    }
    return sortConfig.direction === 'asc' ? <span className="sort-icon">↑</span> : <span className="sort-icon">↓</span>;
  };

  return (
    <div className="card inventory-card">
      <h3>Inventario Actual ({products.length})</h3>
      
      <div className="table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('id')} className="sortable-header">
                ID (SKU) {getSortIcon('id')}
              </th>
              <th onClick={() => requestSort('nombre')} className="sortable-header">
                Nombre {getSortIcon('nombre')}
              </th>
              <th onClick={() => requestSort('categoria')} className="sortable-header">
                Categoría {getSortIcon('categoria')}
              </th>
              <th onClick={() => requestSort('unidad_medida')} className="sortable-header">
                U. Medida {getSortIcon('unidad_medida')}
              </th>
              <th onClick={() => requestSort('cantidad')} className="sortable-header">
                Stock Actual {getSortIcon('cantidad')}
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">No hay productos registrados.</td>
              </tr>
            ) : (
              currentProducts.map((product) => (
                <tr key={product.id}>
                  <td className="font-mono">{product.id}</td>
                  <td className="font-semibold">{product.nombre}</td>
                  <td><span className="badge category-badge">{product.categoria}</span></td>
                  <td>{product.unidad_medida}</td>
                  <td>
                    <span className={`stock-badge ${product.cantidad > 10 ? 'stock-ok' : product.cantidad > 0 ? 'stock-low' : 'stock-out'}`}>
                      {product.cantidad === 0 ? `No hay Stock del producto ${product.nombre}` : product.cantidad}
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

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => paginate(currentPage - 1)} 
            disabled={currentPage === 1}
            className="btn-pagination"
          >
            Anterior
          </button>
          
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
              <button
                key={number}
                onClick={() => paginate(number)}
                className={`btn-page ${currentPage === number ? 'active' : ''}`}
              >
                {number}
              </button>
            ))}
          </div>

          <button 
            onClick={() => paginate(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="btn-pagination"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;
