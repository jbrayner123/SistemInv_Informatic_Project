import React from 'react';
import './DashboardResumen.css';

const DashboardResumen = ({ products }) => {
  // Cálculos de KPIs
  const totalSkus = products.length;
  const totalItems = products.reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
  
  // Productos en alerta (Stock > 0 pero <= al límite)
  const alertProducts = products.filter(p => {
    const min = p.stock_minimo !== undefined ? p.stock_minimo : 5;
    return p.cantidad <= min && p.cantidad > 0;
  }).length;

  // Productos agotados (Stock = 0)
  const outOfStockProducts = products.filter(p => p.cantidad === 0).length;

  return (
    <div className="dashboard-kpi-container">
      <div className="kpi-card">
        <div className="kpi-icon icon-blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
        </div>
        <div className="kpi-content">
          <h4 className="kpi-title">Total Productos</h4>
          <p className="kpi-value">{totalSkus}</p>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon icon-green">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
        </div>
        <div className="kpi-content">
          <h4 className="kpi-title">Artículos Físicos</h4>
          <p className="kpi-value">{totalItems.toLocaleString()}</p>
        </div>
      </div>

      <div className="kpi-card danger">
        <div className="kpi-icon icon-orange">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
        </div>
        <div className="kpi-content">
          <h4 className="kpi-title">Productos en Alerta</h4>
          <p className="kpi-value">{alertProducts}</p>
        </div>
      </div>

      <div className="kpi-card error">
        <div className="kpi-icon icon-red">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        </div>
        <div className="kpi-content">
          <h4 className="kpi-title">Productos Agotados</h4>
          <p className="kpi-value">{outOfStockProducts}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardResumen;
