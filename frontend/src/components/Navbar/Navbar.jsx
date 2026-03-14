import React from 'react';
import './Navbar.css';

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

          <button
            className="theme-toggle"
            onClick={toggleDarkMode}
            aria-label="Alternar modo oscuro"
          >
            {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
          </button>

          <button className="btn-logout" onClick={onLogout} aria-label="Cerrar sesión">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
