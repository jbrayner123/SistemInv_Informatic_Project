import React, { useState } from 'react';
import { api } from '../../api/api';
import { useToast } from '../Toast/ToastContext';
import './InventoryTable.css';
import EditProductModal from '../EditProductModal/EditProductModal';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { saveAs } from 'file-saver';

const InventoryTable = ({ products, onStockUpdated, loading, error, rol = 'admin' }) => {
  const { addToast } = useToast();
  const [stockUpdateAmount, setStockUpdateAmount] = useState({});
  const [submittingIds, setSubmittingIds] = useState(new Set());
  const [localErrors, setLocalErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
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

  const handleUpdateStock = async (id, isAdding) => {
    let amount = stockUpdateAmount[id];
    if (amount === undefined || amount === '' || amount === 0 || isNaN(amount)) return;
    
    // Ensure amount is strictly positive from the input for logic processing, 
    // then apply correct mathematical sign based on the action
    amount = Math.abs(parseInt(amount));
    const finalAmount = isAdding ? amount : -amount;

    setSubmittingIds(prev => new Set(prev).add(id));
    setLocalErrors(prev => ({ ...prev, [id]: null }));

    try {
      const updatedProduct = await api.updateStock(id, finalAmount);
      setStockUpdateAmount(prev => ({ ...prev, [id]: '' }));
      
      const actionText = isAdding ? 'añadieron' : 'restaron';
      addToast(`Se ${actionText} ${amount} ${updatedProduct.unidad_medida.toLowerCase()} de ${updatedProduct.nombre}.`, 'success');
      
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
      addToast(`Error en inventario: ${err.message}`, 'error');
    } finally {
      setSubmittingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleSaveEdit = async (productId, formData) => {
    try {
      setLocalErrors(prev => ({ ...prev, [productId]: null }));
      await api.updateProduct(productId, formData);
      addToast('Producto actualizado correctamente.', 'success');
      if (onStockUpdated) onStockUpdated();
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteClick = (productId, productName) => {
    setProductToDelete({ id: productId, name: productName });
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    const { id, name } = productToDelete;
    
    setSubmittingIds(prev => new Set(prev).add(id));
    setLocalErrors(prev => ({ ...prev, [id]: null }));
    setProductToDelete(null); // Close the modal
    
    try {
      await api.deleteProduct(id);
      addToast(`Producto "${name}" eliminado exitosamente.`, 'success');
      if (onStockUpdated) onStockUpdated();
    } catch (err) {
      setLocalErrors(prev => ({ ...prev, [id]: err.message }));
      addToast(`Error al eliminar: ${err.message}`, 'error');
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
  const MathPages = totalPages > 0 ? totalPages : 1;
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

  const exportToExcel = async () => {
    if (!products || products.length === 0) {
      addToast('No hay productos para exportar.', 'error');
      return;
    }

    try {
      addToast('Preparando documento...', 'info');
      // Importación dinámica (Code Splitting): exceljs solo se descarga de la red si el usuario hace click aquí.
      const ExcelJS = await import('exceljs');
      
      // 1. Inicializar Workbook
      const workbook = new ExcelJS.default.Workbook();
      workbook.creator = 'SistemInv';
      const worksheet = workbook.addWorksheet('Inventario Actual');

      // 2. Definir Columnas
      worksheet.columns = [
        { header: 'ID (SKU)', key: 'id', width: 15 },
        { header: 'NOMBRE DEL PRODUCTO', key: 'nombre', width: 35 },
        { header: 'CATEGORÍA', key: 'categoria', width: 25 },
        { header: 'UNIDAD', key: 'unidad', width: 15 },
        { header: 'STOCK ACTUAL', key: 'stock', width: 15 },
        { header: 'ESTADO', key: 'estado', width: 15 }
      ];

      // 3. Estilizar la Fila de Cabecera (Fondo Verde, Texto Blanco)
      worksheet.getRow(1).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF10B981' } // Verde premium
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 11
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF0D9488' } },
          left: { style: 'thin', color: { argb: 'FF0D9488' } },
          bottom: { style: 'thin', color: { argb: 'FF0D9488' } },
          right: { style: 'thin', color: { argb: 'FF0D9488' } }
        };
      });
      worksheet.getRow(1).height = 25;

      // 4. Agregar Filas y Estilizar (Colores Alternos y Semántica)
      sortedProducts.forEach((p, index) => {
        const threshold = p.stock_minimo !== undefined ? p.stock_minimo : 5;
        let estado = 'ÓPTIMO';
        let stockColor = 'FF10B981'; // Verde

        if (p.cantidad === 0) {
          estado = 'AGOTADO';
          stockColor = 'FFEF4444'; // Rojo
        } else if (p.cantidad <= threshold) {
          estado = 'ALERTA / BAJO';
          stockColor = 'FFF59E0B'; // Naranja
        }

        const row = worksheet.addRow({
          id: p.id,
          nombre: p.nombre,
          categoria: p.categoria,
          unidad: p.unidad_medida,
          stock: p.cantidad,
          estado: estado
        });

        // Alternar color de fondo de la fila (blanco vs gris ultra-claro para leer mejor)
        const isEven = index % 2 === 0;
        const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF9FAFB'; // F9FAFB es un gris muy sutil

        row.eachCell((cell, colNumber) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowBgColor }
          };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 5 || colNumber === 6 ? 'center' : 'left' };
          
          // Dar color específico a la casilla de Estado y Stock
          if (colNumber === 5 || colNumber === 6) {
            cell.font = { color: { argb: stockColor }, bold: true };
          }
        });
      });

      // 5. Generar Archivo y Descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-ES').replace(/\//g, '-');
      const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '');
      const fileName = `Inventario_SistemInv_${dateStr}_${timeStr}.xlsx`;
      
      saveAs(blob, fileName);
      
      addToast('Inventario exportado a Excel exitosamente', 'success');
    } catch (err) {
      addToast('Error al generar Excel: ' + err.message, 'error');
    }
  };

  return (
    <div className="card inventory-card">
      <div className="table-header-premium">
        <button 
          onClick={exportToExcel}
          className="btn-premium btn-export"
          disabled={products.length === 0}
          title="Descargar Inventario con diseño a Excel (.xlsx)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Exportar Excel
        </button>
      </div>
      
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
              {/* Solo admin ve la columna de acciones CRUD */}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  No hay productos registrados en el inventario.
                </td>
              </tr>
            ) : (
              currentProducts.map((product) => (
                <tr key={product.id}>
                  <td className="font-mono">{product.id}</td>
                  <td className="font-semibold">{product.nombre}</td>
                  <td><span className="badge category-badge">{product.categoria}</span></td>
                  <td>{product.unidad_medida}</td>
                  <td>
                    <span 
                      className={`stock-badge ${
                        product.cantidad === 0 
                          ? 'stock-out' 
                          : product.cantidad <= (product.stock_minimo !== undefined ? product.stock_minimo : 5)
                            ? 'stock-low' 
                            : 'stock-ok'
                      }`}
                      title={`Umbral de alerta: ${product.stock_minimo !== undefined ? product.stock_minimo : 5}`}
                    >
                      {product.cantidad === 0 ? `Agotado` : product.cantidad}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <div className="actions-container">
                      <div className="stock-control-group">
                        <button 
                          className="btn-stock btn-out"
                          onClick={() => handleUpdateStock(product.id, false)}
                          disabled={submittingIds.has(product.id) || !stockUpdateAmount[product.id] || stockUpdateAmount[product.id] === 0 || stockUpdateAmount[product.id] > product.cantidad}
                          title="Restar Stock"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        
                        <input 
                          type="number" 
                          placeholder="Cant." 
                          min="1"
                          value={stockUpdateAmount[product.id] !== undefined ? stockUpdateAmount[product.id] : ''}
                          onChange={(e) => handleStockChange(product.id, e.target.value)}
                          disabled={submittingIds.has(product.id)}
                          className="stock-input-premium"
                          title="Cantidad a mover"
                        />
                        
                        <button 
                          className="btn-stock btn-in"
                          onClick={() => handleUpdateStock(product.id, true)}
                          disabled={submittingIds.has(product.id) || !stockUpdateAmount[product.id] || stockUpdateAmount[product.id] === 0}
                          title="Sumar Stock"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                      </div>

                      {/* Botones de Editar/Eliminar — solo visibles para admin */}
                      {rol === 'admin' && (
                        <div className="crud-actions-group">
                          <button 
                            className="btn-crud btn-edit" 
                            onClick={() => setEditingProduct(product)}
                            title="Editar Producto"
                            disabled={submittingIds.has(product.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                          </button>
                          <button 
                            className="btn-crud btn-delete" 
                            onClick={() => handleDeleteClick(product.id, product.nombre)}
                            title="Eliminar Producto"
                            disabled={submittingIds.has(product.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                        </div>
                      )}
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
            ←
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
            →
          </button>
        </div>
      )}

      <EditProductModal 
        isOpen={!!editingProduct}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={handleSaveEdit}
      />

      <ConfirmModal 
        isOpen={!!productToDelete}
        title="Eliminar Producto"
        message={productToDelete ? `¿Estás seguro de que deseas eliminar permanentemente el producto "${productToDelete.name}"? Esta acción no se puede deshacer y borrará todo su historial.` : ''}
        confirmText="Sí, eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
};

export default InventoryTable;
