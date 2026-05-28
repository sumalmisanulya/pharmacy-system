import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Invoices from './pages/Invoices';
import Receipt from './components/Receipt';
import api from './api';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [printInvoice, setPrintInvoice] = useState<any>(null);

  // Load auth state and theme settings on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('pharmacy_user');
    const savedToken = localStorage.getItem('pharmacy_auth_token');
    if (savedUser && savedToken) {
      setCurrentUser(JSON.parse(savedUser));
    }

    const savedTheme = localStorage.getItem('pharmacy_theme') as 'light' | 'dark' | null;
    const finalTheme = savedTheme || 'dark';
    setTheme(finalTheme);
    document.documentElement.setAttribute('data-theme', finalTheme);

    // Listen for unauthorized 401 logs
    const handleAuthLogout = () => {
      setCurrentUser(null);
      setActiveTab('dashboard');
    };

    window.addEventListener('auth-logout', handleAuthLogout);
    return () => {
      window.removeEventListener('auth-logout', handleAuthLogout);
    };
  }, []);

  const handleLoginSuccess = (user: any, token: string) => {
    localStorage.setItem('pharmacy_auth_token', token);
    localStorage.setItem('pharmacy_user', JSON.stringify(user));
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (err) {
      console.error('API logout request failed', err);
    } finally {
      localStorage.removeItem('pharmacy_auth_token');
      localStorage.removeItem('pharmacy_user');
      setCurrentUser(null);
      setActiveTab('dashboard');
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('pharmacy_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Triggers browser native thermal print overlay
  const handlePrintReceipt = (invoice: any) => {
    setPrintInvoice(invoice);
    
    // We wait briefly for React to render the printable container
    // and then call the print dialog.
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="app-container">
      {currentUser && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      <main className="content">
        {!currentUser ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard onIssueBill={handlePrintReceipt} currentUser={currentUser} />
            )}
            {activeTab === 'inventory' && (
              <Inventory currentUser={currentUser} />
            )}
            {activeTab === 'invoices' && (
              <Invoices onReprint={handlePrintReceipt} />
            )}
          </>
        )}
      </main>

      {/* Hidden Receipt container for printing */}
      <Receipt invoice={printInvoice} />
      
      <footer style={{ 
        textAlign: 'center', 
        padding: '2rem 1rem', 
        fontSize: '0.8rem', 
        color: 'var(--text-muted)',
        borderTop: currentUser ? '1px solid var(--border-color)' : 'none',
        marginTop: 'auto'
      }}>
        &copy; {new Date().getFullYear()} MetroRx Pharmacy POS System. All Rights Reserved.
      </footer>
    </div>
  );
};
export default App;
