import React, { useState } from 'react';
import './InventoryFilterBar.css';

const InventoryFilterBar = ({ 
  searchTerm, 
  onSearchChange, 
  categoryFilter, 
  onCategoryChange,
  statusFilter,
  onStatusChange,
  categories = [] 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="filter-bar-container card">
      <div 
        className="accordion-header filter-header" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="accordion-title">Filtros y Búsqueda</h3>
        <div className={`accordion-icon ${isExpanded ? 'expanded' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
      </div>
      
      <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
        <div className="accordion-inner filter-inner">
          <div className="filter-group block-search">
        <label htmlFor="search-input" className="filter-label">Buscar Producto</label>
        <div className="search-wrapper">
          <span className="search-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </span>
          <input 
            id="search-input"
            type="text" 
            className="filter-input input-search"
            placeholder="Buscar por SKU o Nombre..." 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button 
              className="clear-search-btn" 
              onClick={() => onSearchChange('')}
              title="Limpiar búsqueda"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>
      </div>

      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="category-filter" className="filter-label">Filtro de Categoría</label>
          <div className="select-wrapper">
            <select 
              id="category-filter"
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map((cat, index) => (
                <option key={index} value={cat}>{cat}</option>
              ))}
            </select>
            <span className="select-chevron">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </span>
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter" className="filter-label">Filtro de Estado</label>
          <div className="select-wrapper">
            <select 
              id="status-filter"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="ALL">Todos los Estados</option>
              <option value="OK">Óptimo (Stock OK)</option>
              <option value="LOW">En Alerta (Stock Bajo)</option>
              <option value="OUT">Agotados (Stock 0)</option>
            </select>
            <span className="select-chevron">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </span>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
);
};

export default InventoryFilterBar;
