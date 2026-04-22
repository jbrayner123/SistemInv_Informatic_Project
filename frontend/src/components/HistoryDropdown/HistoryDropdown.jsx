import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/api';
import './HistoryDropdown.css';

const HistoryDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar el historial al montar, escuchar eventos de inventario, y configurar polling (cada 10s)
  useEffect(() => {
    fetchHistory();
    
    const handleInventoryChange = () => fetchHistory(true);
    window.addEventListener('inventory-changed', handleInventoryChange);

    const intervalId = setInterval(() => {
      fetchHistory(true);
    }, 30000);

    return () => {
      window.removeEventListener('inventory-changed', handleInventoryChange);
      clearInterval(intervalId);
    };
  }, []);

  const fetchHistory = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const data = await api.getHistory();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      setLoading(true);
      await api.clearHistory();
      setHistory([]);
    } catch (error) {
      console.error('Error al limpiar historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchHistory();
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Hace un momento';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Hace ${days} d`;
    
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'CREACIÓN':
        return <span className="action-icon create-icon">+</span>;
      case 'ENTRADA':
        return <span className="action-icon in-icon">↑</span>;
      case 'SALIDA':
        return <span className="action-icon out-icon">↓</span>;
      case 'EDICIÓN':
        return <span className="action-icon edit-icon">✎</span>;
      case 'ELIMINACIÓN':
        return <span className="action-icon delete-icon">×</span>;
      case 'ALERTA':
        return <span className="action-icon alert-icon">!</span>;
      default:
        return <span className="action-icon default-icon">•</span>;
    }
  };

  return (
    <div className="history-dropdown-wrapper" ref={dropdownRef}>
      <button 
        className={`history-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleDropdown}
        title="Historial de Movimientos"
      >
        <div className="notification-trigger-wrap">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={history.length > 0 ? "bell-ringing" : "bell-normal"}
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
          </svg>
          {history.length > 0 && (
            <span className="notification-counter">{history.length > 99 ? '99+' : history.length}</span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="history-dropdown-panel">
          <div className="history-header">
            <h3>Actividad Reciente</h3>
            <div className="history-header-actions">
              <span className="history-badge">{history.length}</span>
              {history.length > 0 && (
                <button 
                  className="btn-clear-history" 
                  onClick={handleClearHistory}
                  title="Marcar todos como leídos / Limpiar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="history-content">
            {loading && history.length === 0 ? (
              <div className="history-loading">
                <div className="spinner"></div>
                <p>Cargando historial...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="history-empty">
                <p>No hay movimientos registrados.</p>
              </div>
            ) : (
              <ul className="history-list">
                {history.map((item) => (
                  <li key={item.id} className="history-item">
                    <div className="history-item-icon">
                      {getActionIcon(item.accion)}
                    </div>
                    <div className="history-item-details">
                      <p className="history-item-text">
                        <strong className="user-name">{item.usuario}</strong>{' '}
                        <span className="user-role">({item.rol})</span>{' '}
                        {item.detalles}
                      </p>
                      <span className="history-item-time">{formatTimeAgo(item.fecha)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryDropdown;
