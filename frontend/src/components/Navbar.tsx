import React from 'react';
import { Pill, Sun, Moon, LogOut, LayoutDashboard, Package, FileText, User } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: any;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  theme,
  toggleTheme
}) => {
  return (
    <header>
      <div className="navbar">
        <div className="logo" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
          <Pill size={24} style={{ color: 'var(--accent-cyan)' }} />
          <span>METRO<span style={{ color: 'var(--text-primary)', fontWeight: 300 }}>RX</span></span>
        </div>

        <nav>
          <ul className="nav-links">
            <li>
              <span 
                className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <LayoutDashboard size={16} /> POS Billing
                </span>
              </span>
            </li>
            <li>
              <span 
                className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Package size={16} /> Stock Inventory
                </span>
              </span>
            </li>
            <li>
              <span 
                className={`nav-link ${activeTab === 'invoices' ? 'active' : ''}`}
                onClick={() => setActiveTab('invoices')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <FileText size={16} /> Billing Ledger
                </span>
              </span>
            </li>
          </ul>
        </nav>

        <div className="nav-actions">
          {/* Theme switcher */}
          <button 
            onClick={toggleTheme}
            className="qty-btn theme-toggle"
            style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* User state badge */}
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-color)' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <User size={10} /> 
                  <span className={`badge ${
                    currentUser.role === 'super_admin' ? 'badge-danger' : 
                    currentUser.role === 'admin' ? 'badge-warning' : 
                    'badge-success'
                  }`} style={{ padding: '1px 4px', fontSize: '0.65rem' }}>
                    {currentUser.role.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={onLogout}
                className="qty-btn"
                style={{ width: '36px', height: '36px', borderRadius: '10px', color: 'var(--accent-red)', borderColor: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default Navbar;
