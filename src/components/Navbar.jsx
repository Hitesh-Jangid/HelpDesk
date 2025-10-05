import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/tickets" className="navbar-brand">
          <div className="brand-logo">
            <span className="logo-icon">🎫</span>
            <div className="logo-text">
              <span className="logo-name">HelpDesk</span>
              <span className="logo-tagline">Support System</span>
            </div>
          </div>
          <span className="brand-creator">hiteshjangid</span>
        </Link>
        
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>

        <ul className={`navbar-links ${menuOpen ? 'active' : ''}`}>
          <li>
            <Link 
              to="/tickets" 
              className={location.pathname === '/tickets' && !location.search ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              📊 Dashboard
            </Link>
          </li>
          
          {user.role === 'agent' && (
            <li>
              <Link 
                to="/tickets?assigned=true" 
                className={location.search === '?assigned=true' ? 'active' : ''}
                onClick={() => setMenuOpen(false)}
              >
                📋 My Tickets
              </Link>
            </li>
          )}
          
          {user.role === 'admin' && (
            <>
              <li>
                <Link 
                  to="/reports/sla" 
                  className={location.pathname === '/reports/sla' ? 'active' : ''}
                  onClick={() => setMenuOpen(false)}
                >
                  📈 Reports
                </Link>
              </li>
              <li>
                <Link 
                  to="/users" 
                  className={location.pathname === '/users' ? 'active' : ''}
                  onClick={() => setMenuOpen(false)}
                >
                  👥 Users
                </Link>
              </li>
            </>
          )}
          
          <li className="user-info">
            <span className="role-badge">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
            <span className="username-text">@{user.username || user.email.split('@')[0]}</span>
          </li>
          
          <li>
            <button onClick={() => { logout(); setMenuOpen(false); }} className="logout-btn">
              🚪 Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;