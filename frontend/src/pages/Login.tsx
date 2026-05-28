import React, { useState, useEffect } from 'react';
import { api, type ApiError } from '../api';
import { ShieldAlert, KeyRound, Delete } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Listen to physical keyboard number keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;

      if (e.key >= '0' && e.key <= '9') {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, loading]);

  // Submit automatically when 4 digits are input
  useEffect(() => {
    if (pin.length === 4) {
      submitPin(pin);
    }
  }, [pin]);

  const handleDigitPress = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const submitPin = async (enteredPin: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{ access_token: string; user: any }>('/auth/pin', {
        pin_code: enteredPin,
      });
      onLoginSuccess(response.user, response.access_token);
    } catch (err: any) {
      const apiErr = err as ApiError;
      setError(apiErr.message || 'Incorrect PIN code.');
      setPin(''); // Reset PIN on failure
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="glass-panel gradient-border-cyan" style={{ width: '380px', padding: '2.5rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Key/Authentication Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)'
          }}>
            <KeyRound size={28} color="white" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Staff Login</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Enter your 4-digit security PIN code
          </p>
        </div>

        {/* Interactive Dots for PIN Inputs */}
        <div style={{ display: 'flex', gap: '1.25rem', margin: '1rem 0 2rem' }}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid var(--border-color)',
                  background: isFilled 
                    ? 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))' 
                    : 'transparent',
                  boxShadow: isFilled ? '0 0 10px var(--accent-cyan)' : 'none',
                  transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
              />
            );
          })}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="alert-panel animate-slide-in" style={{ marginBottom: '1.5rem', width: '100%', padding: '0.75rem', background: 'rgba(244, 63, 94, 0.08)', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
            <ShieldAlert className="alert-icon" style={{ color: 'var(--accent-red)' }} size={16} />
            <div className="alert-body">
              <h4 style={{ color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: 600 }}>Access Denied</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Verification Status */}
        {loading && (
          <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '1rem', fontWeight: 500 }}>
            Verifying secure PIN...
          </div>
        )}

        {/* PIN Keyboard Pad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          width: '100%'
        }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className="qty-btn"
              onClick={() => handleDigitPress(digit)}
              disabled={loading}
              style={{
                height: '60px',
                borderRadius: '50%',
                fontSize: '1.35rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              {digit}
            </button>
          ))}
          
          <button
            type="button"
            className="qty-btn"
            onClick={handleClear}
            disabled={loading}
            style={{
              height: '60px',
              borderRadius: '50%',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)'
            }}
          >
            Clear
          </button>
          
          <button
            type="button"
            className="qty-btn"
            onClick={() => handleDigitPress('0')}
            disabled={loading}
            style={{
              height: '60px',
              borderRadius: '50%',
              fontSize: '1.35rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)'
            }}
          >
            0
          </button>

          <button
            type="button"
            className="qty-btn"
            onClick={handleBackspace}
            disabled={loading || pin.length === 0}
            style={{
              height: '60px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)'
            }}
          >
            <Delete size={20} />
          </button>
        </div>

      </div>

      {/* Demo helper */}
      <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p><strong>Demo PIN Codes:</strong> Super Admin: <code style={{ color: 'var(--accent-cyan)' }}>1234</code> | Admin Cashier: <code style={{ color: 'var(--accent-cyan)' }}>2222</code> | Pharmacist: <code style={{ color: 'var(--accent-cyan)' }}>5555</code></p>
        <p style={{ marginTop: '0.25rem' }}>(Use your physical keyboard number keys or click the on-screen buttons)</p>
      </div>
    </div>
  );
};
export default Login;
