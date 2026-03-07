import React from 'react';
import './Navbar.css';

const Navbar = ({ toggleDarkMode, isDarkMode }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <h2>Sisteminv</h2>
        </div>
        <button 
          className="theme-toggle" 
          onClick={toggleDarkMode}
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? '☀️ Claro' : '🌙 Oscuro'}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
