import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Download } from 'lucide-react';
import './Header.css';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="app-header glass">
      <div className="header-container">
        <NavLink to="/" className="logo-section" onClick={closeMobileMenu}>
          <div className="logo-icon-wrapper">
            <Download className="logo-icon" size={20} />
          </div>
          <span className="logo-text">MediaFlow</span>
        </NavLink>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
            Home
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            History
          </NavLink>
          <NavLink to="/supported" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Supported
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Settings
          </NavLink>
        </nav>

        {/* Mobile Hamburger Toggle */}
        <button className="mobile-toggle" onClick={toggleMobileMenu} aria-label="Toggle navigation menu">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav className="mobile-nav glass">
          <NavLink to="/" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} end onClick={closeMobileMenu}>
            Home
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
            History
          </NavLink>
          <NavLink to="/supported" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
            Supported
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
            Settings
          </NavLink>
        </nav>
      )}
    </header>
  );
}
