import React, { useState, useEffect, useRef } from 'react';
import { api, type ApiError } from '../api';
import { 
  Search, ShoppingCart, AlertTriangle, FileText, 
  Package, CreditCard, User, Tag, Percent
} from 'lucide-react';

interface CartItem {
  id: number;
  name: string;
  pin_number: string;
  price_per_card: number;
  price_per_pill: number;
  pills_per_card: number;
  quantity: number;
  unit: 'card' | 'pill';
  maxPills: number;
}

interface AdminSales {
  admin_name: string;
  total_sales: string | number;
  sales_count: number;
}

interface Stats {
  total_items: number;
  out_of_stock: number;
  low_stock: number;
  inventory_value: number;
  sales_today: number;
  invoices_today: number;
  sales_by_admin?: AdminSales[];
  recent_invoices: any[];
}

interface DashboardProps {
  onIssueBill: (invoice: any) => void;
  currentUser: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ onIssueBill, currentUser }) => {
  const [stats, setStats] = useState<Stats>({
    total_items: 0,
    out_of_stock: 0,
    low_stock: 0,
    inventory_value: 0,
    sales_today: 0,
    invoices_today: 0,
    sales_by_admin: [],
    recent_invoices: [],
  });

  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  
  // Checkout details
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Barcode scanner logic for POS screen
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    fetchStats();
    fetchLowStock();
  }, []);

  // Debounced Search logic for medicine autocomplete
  useEffect(() => {
    if (search.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const response = await api.get<any>(`/items?search=${search}&per_page=8`);
        setSuggestions(response.data || []);
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  // Global scanner listener for scanning items directly into the cart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // Clear buffer if there is a typing gap > 200ms
      if (currentTime - lastKeyTime.current > 200) {
        barcodeBuffer.current = '';
      }
      lastKeyTime.current = currentTime;

      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt') {
        return;
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 2) {
          const barcode = barcodeBuffer.current;
          barcodeBuffer.current = '';
          
          // Check if we are typing inside an active input field that isn't the main search
          const activeEl = document.activeElement;
          if (activeEl && activeEl.tagName === 'INPUT' && activeEl.id !== 'pos-search-input') {
            return;
          }
          
          scanItemIntoCart(barcode);
        }
      } else {
        if (e.key.length === 1) {
          barcodeBuffer.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]); // recreate listener to close over fresh cart state

  const fetchStats = async () => {
    try {
      const data = await api.get<Stats>('/dashboard/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchLowStock = async () => {
    try {
      const data = await api.get<any[]>('/items/low-stock');
      setLowStockItems(data);
    } catch (err) {
      console.error('Failed to load low stock items:', err);
    }
  };

  const scanItemIntoCart = async (barcode: string) => {
    try {
      const response = await api.get<any>(`/items?search=${barcode}&per_page=1`);
      const items = response.data || [];
      if (items.length > 0) {
        const item = items[0];
        if (item.pin_number === barcode) {
          addItemToCart(item);
          setSuccessMsg(`Scanned: ${item.name}`);
          setTimeout(() => setSuccessMsg(null), 1500);
        }
      }
    } catch (err) {
      console.error('Barcode item lookup failed:', err);
    }
  };

  const addItemToCart = (item: any) => {
    if (item.quantity <= 0) {
      setError(`Cannot add ${item.name} to bill. It is out of stock!`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((i) => i.id === item.id);
      
      if (existingIndex > -1) {
        const existing = prevCart[existingIndex];
        const nextQty = existing.quantity + 1;
        
        // Calculate total pills needed for this row
        const pillsNeeded = existing.unit === 'card' 
          ? nextQty * existing.pills_per_card 
          : nextQty;
          
        if (pillsNeeded > item.quantity) {
          setError(`Cannot add more. Stock limit reached for ${item.name} (${item.quantity} pills available).`);
          setTimeout(() => setError(null), 3000);
          return prevCart;
        }
        
        return prevCart.map((i, idx) => 
          idx === existingIndex ? { ...i, quantity: nextQty } : i
        );
      } else {
        const defaultUnit = item.pills_per_card > 1 ? 'card' : 'pill';
        const neededPills = defaultUnit === 'card' ? item.pills_per_card : 1;
        
        if (neededPills > item.quantity) {
          if (item.quantity >= 1) {
            return [
              ...prevCart,
              {
                id: item.id,
                name: item.name,
                pin_number: item.pin_number,
                price_per_card: Number(item.price_per_card),
                price_per_pill: Number(item.price_per_pill),
                pills_per_card: Number(item.pills_per_card),
                quantity: 1,
                unit: 'pill',
                maxPills: item.quantity
              }
            ];
          } else {
            setError(`Cannot add ${item.name}. It is out of stock!`);
            setTimeout(() => setError(null), 3000);
            return prevCart;
          }
        }
        
        return [
          ...prevCart, 
          { 
            id: item.id, 
            name: item.name, 
            pin_number: item.pin_number, 
            price_per_card: Number(item.price_per_card), 
            price_per_pill: Number(item.price_per_pill), 
            pills_per_card: Number(item.pills_per_card), 
            quantity: 1, 
            unit: defaultUnit,
            maxPills: item.quantity 
          }
        ];
      }
    });

    setSearch('');
    setSuggestions([]);
  };

  const changeUnit = (id: number, unit: 'card' | 'pill') => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === id) {
          if (unit === 'card' && item.maxPills < item.pills_per_card) {
            setError(`Not enough stock to sell a full card of ${item.name} (${item.maxPills} pills left).`);
            setTimeout(() => setError(null), 3000);
            return item;
          }
          const maxQty = unit === 'card' 
            ? Math.floor(item.maxPills / item.pills_per_card) 
            : item.maxPills;
          const newQty = Math.min(item.quantity, maxQty) || 1;
          return { ...item, unit, quantity: newQty };
        }
        return item;
      })
    );
  };

  const updateQuantity = (id: number, qty: number) => {
    setCart((prevCart) => 
      prevCart.map((item) => {
        if (item.id === id) {
          const maxQty = item.unit === 'card' 
            ? Math.floor(item.maxPills / item.pills_per_card) 
            : item.maxPills;
          const newQty = Math.max(1, Math.min(maxQty, qty));
          if (qty > maxQty) {
            setError(`Cannot exceed stock limit of ${maxQty} ${item.unit}s for ${item.name}.`);
            setTimeout(() => setError(null), 3000);
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeItem = (id: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setDiscount(0);
    setTax(0);
    setCashReceived('');
    setError(null);
  };

  // Calculating pricing
  const subtotal = cart.reduce((sum, item) => {
    const price = item.unit === 'card' ? item.price_per_card : item.price_per_pill;
    return sum + (price * item.quantity);
  }, 0);
  
  const netTotal = Math.max(0, subtotal - discount + tax);

  // Cash change logic
  const numericCashReceived = Number(cashReceived) || 0;
  const change = paymentMethod === 'Cash' && numericCashReceived > netTotal 
    ? numericCashReceived - netTotal 
    : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Cash' && numericCashReceived < netTotal) {
      setError(`Insufficient cash received. Need at least LKR ${netTotal.toFixed(2)}.`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setCheckoutLoading(true);
    setError(null);

    const payload = {
      customer_name: customerName || null,
      discount: discount,
      tax: tax,
      payment_method: paymentMethod,
      amount_paid: paymentMethod === 'Cash' ? numericCashReceived : netTotal,
      change_amount: paymentMethod === 'Cash' ? change : 0,
      items: cart.map((item) => ({
        item_id: item.id,
        quantity: item.quantity,
        unit: item.unit,
      })),
    };

    try {
      const response = await api.post<{ message: string; invoice: any }>('/invoices', payload);
      
      setSuccessMsg('Transaction Successful! Opening print receipt...');
      
      // Clear forms
      clearCart();
      
      // Refresh dashboard analytics
      fetchStats();
      fetchLowStock();

      // Trigger receipt print modal / callback
      setTimeout(() => {
        setSuccessMsg(null);
        onIssueBill(response.invoice);
      }, 1000);
      
    } catch (err: any) {
      const apiErr = err as ApiError;
      setError(apiErr.message || 'Checkout transaction failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const formatStock = (qty: number, pillsPerCard: number) => {
    if (!pillsPerCard || pillsPerCard <= 1) return `${qty} pills`;
    const cards = Math.floor(qty / pillsPerCard);
    const pills = qty % pillsPerCard;
    if (cards > 0 && pills > 0) {
      return `${cards} card${cards > 1 ? 's' : ''}, ${pills} pill${pills > 1 ? 's' : ''}`;
    } else if (cards > 0) {
      return `${cards} card${cards > 1 ? 's' : ''}`;
    } else {
      return `${pills} pill${pills > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Widgets Grid */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-card-info">
            <h3>Revenue Today</h3>
            <p>LKR {stats.sales_today.toFixed(2)}</p>
          </div>
          <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-green)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>LKR</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-card-info">
            <h3>Sales Completed</h3>
            <p>{stats.invoices_today}</p>
          </div>
          <div className="stat-card-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)' }}>
            <FileText size={24} />
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-card-info">
            <h3>Medicines Listed</h3>
            <p>{stats.total_items}</p>
          </div>
          <div className="stat-card-icon" style={{ background: 'rgba(6, 182, 212, 0.12)', color: 'var(--accent-cyan)' }}>
            <Package size={24} />
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ border: stats.low_stock > 0 ? '1px solid rgba(251, 146, 60, 0.3)' : '' }}>
          <div className="stat-card-info">
            <h3>Low Stock Alerts</h3>
            <p style={{ color: stats.low_stock > 0 ? 'var(--accent-orange)' : 'inherit' }}>{stats.low_stock}</p>
          </div>
          <div className="stat-card-icon" style={{ 
            background: stats.low_stock > 0 ? 'rgba(251, 146, 60, 0.15)' : 'rgba(255,255,255,0.05)', 
            color: stats.low_stock > 0 ? 'var(--accent-orange)' : 'var(--text-muted)'
          }}>
            <AlertTriangle size={24} className={stats.low_stock > 0 ? 'alert-icon' : ''} />
          </div>
        </div>
      </div>

      {/* Action status popups */}
      {successMsg && (
        <div className="alert-panel animate-slide-in" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', marginTop: '5px' }} />
          <div className="alert-body">
            <h4 style={{ color: 'var(--accent-green)' }}>Success</h4>
            <p style={{ color: 'var(--text-secondary)' }}>{successMsg}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="alert-panel animate-slide-in" style={{ background: 'rgba(244, 63, 94, 0.08)', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
          <AlertTriangle className="alert-icon" style={{ color: 'var(--accent-red)' }} size={18} />
          <div className="alert-body">
            <h4 style={{ color: 'var(--accent-red)' }}>Transaction Warning</h4>
            <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          </div>
        </div>
      )}

      {/* 2. Main Workspace Layout */}
      <div className="dashboard-layout">
        
        {/* Left Side: Inventory Search & Suggestions */}
        <div className="pos-panel">
          <div className="glass-panel" style={{ padding: '2rem', position: 'relative', zIndex: 10 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={18} color="var(--accent-cyan)" /> Find Medication
            </h3>
            
            <div className="search-box">
              <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                id="pos-search-input"
                type="text" 
                className="search-input" 
                placeholder="Search by name, brand, or scan barcode SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
              
              {/* Autocomplete Suggestions Box */}
              {suggestions.length > 0 && (
                <div className="glass-panel search-suggestions-dropdown animate-slide-in">
                  {suggestions.map((item) => {
                    const isOutOfStock = item.quantity === 0;
                    const isLowStock = item.quantity <= item.low_stock_threshold;
                    
                    return (
                      <div 
                        key={item.id} 
                        className="search-suggestion-item"
                        onClick={() => addItemToCart(item)}
                        style={{ opacity: isOutOfStock ? 0.6 : 1 }}
                      >
                        <div className="search-suggestion-info">
                          <h4>{item.name}</h4>
                          <span>Barcode PIN: {item.pin_number} | Brand: {item.brand?.name || 'N/A'} | Category: {item.category?.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {isOutOfStock ? (
                            <span className="badge badge-danger">Out of stock</span>
                          ) : isLowStock ? (
                            <span className="badge badge-warning">{formatStock(item.quantity, item.pills_per_card)} left</span>
                          ) : (
                            <span className="badge badge-success">{formatStock(item.quantity, item.pills_per_card)}</span>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>LKR {Number(item.price_per_card).toFixed(2)}/card</span>
                            <span style={{ color: 'var(--text-secondary)' }}>LKR {Number(item.price_per_pill).toFixed(2)}/pill</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {search.trim().length > 0 && suggestions.length === 0 && (
              <div style={{ marginTop: '1rem', padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No medicines found matching "{search}"
              </div>
            )}
          </div>

          {/* Admin Sales Breakdown (Only for Admin/Super Admin) */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && stats.sales_by_admin && stats.sales_by_admin.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-purple)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} /> Daily Sales by Cashier
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats.sales_by_admin.map((staff, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {staff.admin_name}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{staff.sales_count} bills</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-green)' }}>LKR {Number(staff.total_sales).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Stock Panel warnings */}
          {lowStockItems.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', zIndex: 1 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-orange)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} /> Reorder Alerts (Low Stock)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
                {lowStockItems.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid rgba(251,146,60,0.1)' }}>
                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({item.brand?.name || 'No Brand'})</span>
                    </div>
                    <div>
                      {item.quantity === 0 ? (
                        <span className="badge badge-danger">Out of stock</span>
                      ) : (
                        <span className="badge badge-warning">{formatStock(item.quantity, item.pills_per_card)} left</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Active POS Checkout Cart */}
        <div className="glass-panel cart-panel">
          <div className="cart-header">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={20} color="var(--accent-purple)" /> Checkout Cart
            </h3>
            {cart.length > 0 && (
              <button onClick={clearCart} style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                Clear All
              </button>
            )}
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <ShoppingCart size={48} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                <p>No medicines added. Scan a barcode or search for items to build the bill.</p>
              </div>
            ) : (
              cart.map((item) => {
                const itemPrice = item.unit === 'card' ? item.price_per_card : item.price_per_pill;

                return (
                  <div key={item.id + '-' + item.unit} className="cart-item animate-slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'start' }}>
                      <div className="cart-item-desc">
                        <h4>{item.name}</h4>
                        <p>PIN: {item.pin_number}</p>
                      </div>
                      
                      <button 
                        onClick={() => removeItem(item.id)} 
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                      >
                        ×
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem' }}>
                      {/* Unit Selector */}
                      <div>
                        {item.pills_per_card > 1 ? (
                          <select 
                            className="form-control"
                            value={item.unit}
                            onChange={(e) => changeUnit(item.id, e.target.value as 'card' | 'pill')}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto', background: 'var(--bg-input)' }}
                          >
                            <option value="card">Cards</option>
                            <option value="pill">Pills</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pills</span>
                        )}
                      </div>

                      {/* Quantity Buttons */}
                      <div className="cart-item-qty">
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', width: '24px', textAlign: 'center' }}>{item.quantity}</span>
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>

                      {/* Subtotal Display */}
                      <div className="cart-item-price" style={{ fontSize: '0.9rem', textAlign: 'right', fontWeight: 700 }}>
                        LKR {(itemPrice * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="cart-summary">
            {/* Customer name and adjustments form */}
            {cart.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <User size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text" 
                      placeholder="Customer Name (optional)" 
                      className="form-control"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={{ paddingLeft: '2rem', fontSize: '0.8rem', padding: '0.5rem' }}
                    />
                  </div>
                  <div style={{ width: '120px' }}>
                    <select
                      className="form-control"
                      value={paymentMethod}
                      onChange={(e: any) => {
                        setPaymentMethod(e.target.value);
                        setCashReceived('');
                      }}
                      style={{ fontSize: '0.8rem', padding: '0.5rem', width: '100%' }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Tag size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="number" 
                      placeholder="Discount LKR" 
                      className="form-control"
                      value={discount || ''}
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                      style={{ paddingLeft: '2rem', fontSize: '0.8rem', padding: '0.5rem' }}
                    />
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Percent size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="number" 
                      placeholder="Tax LKR" 
                      className="form-control"
                      value={tax || ''}
                      onChange={(e) => setTax(Math.max(0, Number(e.target.value)))}
                      style={{ paddingLeft: '2rem', fontSize: '0.8rem', padding: '0.5rem' }}
                    />
                  </div>
                </div>

                {/* Cash payment specific fields */}
                {paymentMethod === 'Cash' && (
                  <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Cash Received (LKR)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 500" 
                        className="form-control"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem', width: '100%', fontWeight: 'bold' }}
                      />
                    </div>
                    <div style={{ width: '120px', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Change Due</span>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>LKR {change.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="summary-row">
              <span>Subtotal</span>
              <span>LKR {subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Discount</span>
              <span style={{ color: 'var(--accent-red)' }}>-LKR {discount.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Tax</span>
              <span>+LKR {tax.toFixed(2)}</span>
            </div>
            
            <div className="summary-row total">
              <span>Net Total</span>
              <span style={{ color: 'var(--accent-cyan)' }}>LKR {netTotal.toFixed(2)}</span>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem' }}
              disabled={cart.length === 0 || checkoutLoading}
              onClick={handleCheckout}
            >
              <CreditCard size={18} />
              {checkoutLoading ? 'Processing Checkout...' : 'Issue Bill & Print'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default Dashboard;
