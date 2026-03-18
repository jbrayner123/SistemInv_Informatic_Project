import React from 'react';
import './Navbar.css';
import HistoryDropdown from '../HistoryDropdown/HistoryDropdown';

/**
 * Navbar principal.
 * Props:
 *  - toggleDarkMode: () => void
 *  - isDarkMode: boolean
 *  - username: string — nombre completo del usuario logueado
 *  - rol: 'admin' | 'empleado'
 *  - onLogout: () => void
 */
const Navbar = ({ toggleDarkMode, isDarkMode, username, rol, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <h2>SistemInv</h2>
        </div>

        <div className="navbar-actions">
          {/* Indicador de usuario y rol */}
          <div className="user-info">
            <span className="user-name">{username}</span>
            <span className={`role-badge ${rol === 'admin' ? 'role-admin' : 'role-empleado'}`}>
              {rol === 'admin' ? 'Administrador' : 'Empleado'}
            </span>
          </div>

          <div className="navbar-icon-group">
            <button
              className="navbar-icon-btn"
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>

            <button 
              className="navbar-icon-btn btn-logout-icon" 
              onClick={onLogout} 
              title="Cerrar Sesión"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>

            {/* Historial interactivo tipo notificaciones */}
            <HistoryDropdown />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
