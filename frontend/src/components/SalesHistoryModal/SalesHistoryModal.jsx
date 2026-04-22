import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useToast } from '../Toast/ToastContext';
import './SalesHistoryModal.css';

const SalesHistoryModal = ({ onClose }) => {
  const { addToast } = useToast();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        const data = await api.getSales();
        setSales(data);
      } catch (err) {
        addToast('Error al cargar facturas: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSales();
  }, []);

  const formatDate = (isoString) => {
    try {
      return new Date(isoString).toLocaleString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="sales-history-overlay" onClick={onClose}>
      <div className="sales-history-content card" onClick={e => e.stopPropagation()}>
        <div className="sales-header">
          <h3>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Historial de Facturas (Tickets)
          </h3>
          <button className="sales-close-btn" onClick={onClose} title="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="sales-body">
          {loading ? (
            <p className="loading-text">Cargando recibos...</p>
          ) : sales.length === 0 ? (
            <div className="sales-empty">
              <h4>No hay ventas registradas</h4>
              <p>Las ventas realizadas en el cajero (POS) aparecerán aquí.</p>
            </div>
          ) : (
            <div className="sales-list">
              {sales.map((sale) => (
                <div key={sale.id_venta || sale._id} className="sale-ticket">
                  <div className="sale-ticket-header">
                    <div className="sale-info">
                      <span className="sale-id">Factura #{sale.id_venta?.substring(0, 8).toUpperCase() || 'N/A'}</span>
                      <span className="sale-seller">Cajero: {sale.vendedor} <span style={{color: 'var(--muted-text)', fontSize: '0.8rem'}}>({sale.username})</span></span>
                      <span className="sale-date">{formatDate(sale.fecha)}</span>
                    </div>
                    <div className="sale-total">
                      ${sale.total?.toLocaleString('es-CO')}
                    </div>
                  </div>
                  
                  <table className="sale-items-table">
                    <thead>
                      <tr>
                        <th className="item-qty">CANT</th>
                        <th>ARTÍCULO</th>
                        <th className="item-price">P. U.</th>
                        <th className="item-subtotal">SUBTOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sale.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="item-qty">{item.qty}x</td>
                          <td>{item.nombre}</td>
                          <td className="item-price">${item.precio?.toLocaleString('es-CO')}</td>
                          <td className="item-subtotal">${(item.precio * item.qty).toLocaleString('es-CO')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesHistoryModal;
