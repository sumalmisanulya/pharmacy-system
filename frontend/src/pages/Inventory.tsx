import React, { useState, useEffect } from 'react';
import { api, type ApiError } from '../api';
import { 
  Plus, Edit, Trash2, Search, Filter, AlertTriangle, 
  ChevronLeft, ChevronRight, X, Sparkles
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

interface Item {
  id: number;
  category_id: number;
  brand_id?: number;
  brand?: Brand;
  name: string;
  pin_number: string;
  price: string | number;
  price_per_card: string | number;
  price_per_pill: string | number;
  pills_per_card: number;
  quantity: number; // total pills
  low_stock_threshold: number;
  category?: Category;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

interface InventoryProps {
  currentUser: any;
}

export const Inventory: React.FC<InventoryProps> = ({ currentUser }) => {
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    brand_name: '',
    name: '',
    pin_number: '',
    price_per_card: '',
    price_per_pill: '',
    pills_per_card: '',
    quantity: '0', // total pills
    cards_to_add: '0', // to add to stock
    initial_cards: '', // for new items
    low_stock_threshold: '10'
  });

  const [modalError, setModalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Autocomplete for name in modal
  const [nameSuggestions, setNameSuggestions] = useState<Item[]>([]);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [page, selectedCategory, showLowStockOnly]);

  // Debounced item listing search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchItems();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  // Query existing items if the name is typed (autocomplete for existing)
  useEffect(() => {
    if (editingItem || formData.name.trim().length < 1 || modalOpen === false) {
      setNameSuggestions([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        const response = await api.get<any>(`/items?search=${formData.name}&per_page=5`);
        // Suggest items that match the name or barcode closely
        const matches = (response.data || []).filter(
          (item: Item) => 
            item.name.toLowerCase().includes(formData.name.toLowerCase()) ||
            item.pin_number.toLowerCase().includes(formData.name.toLowerCase())
        );
        setNameSuggestions(matches);
      } catch (err) {
        console.error('Failed to load autocomplete items', err);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [formData.name, editingItem, modalOpen]);

  const fetchCategories = async () => {
    try {
      const data = await api.get<Category[]>('/categories');
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchBrands = async () => {
    try {
      const data = await api.get<Brand[]>('/brands');
      setBrands(data);
    } catch (err) {
      console.error('Failed to load brands', err);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = `/items?page=${page}&search=${search}&per_page=12`;
      if (selectedCategory) {
        url += `&category_id=${selectedCategory}`;
      }
      if (showLowStockOnly) {
        url += `&low_stock=true`;
      }
      
      const response = await api.get<any>(url);
      setItems(response.data || []);
      setMeta({
        current_page: response.current_page,
        last_page: response.last_page,
        total: response.total,
        per_page: response.per_page
      });
    } catch (err) {
      console.error('Failed to load items', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      category_id: categories.length > 0 ? String(categories[0].id) : '',
      brand_name: '',
      name: '',
      pin_number: '',
      price_per_card: '',
      price_per_pill: '',
      pills_per_card: '10',
      quantity: '0',
      cards_to_add: '0',
      initial_cards: '0',
      low_stock_threshold: '10'
    });
    setNameSuggestions([]);
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setFormData({
      category_id: String(item.category_id),
      brand_name: item.brand?.name || '',
      name: item.name,
      pin_number: item.pin_number,
      price_per_card: String(item.price_per_card),
      price_per_pill: String(item.price_per_pill),
      pills_per_card: String(item.pills_per_card),
      quantity: String(item.quantity),
      cards_to_add: '0',
      initial_cards: '',
      low_stock_threshold: String(item.low_stock_threshold)
    });
    setNameSuggestions([]);
    setModalError(null);
    setModalOpen(true);
  };

  const loadExistingItemDetails = (item: Item) => {
    setEditingItem(item);
    setFormData({
      category_id: String(item.category_id),
      brand_name: item.brand?.name || '',
      name: item.name,
      pin_number: item.pin_number,
      price_per_card: String(item.price_per_card),
      price_per_pill: String(item.price_per_pill),
      pills_per_card: String(item.pills_per_card),
      quantity: String(item.quantity),
      cards_to_add: '0',
      initial_cards: '',
      low_stock_threshold: String(item.low_stock_threshold)
    });
    setNameSuggestions([]);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setModalError(null);

    // Calculate final pill count based on mode
    const pillsPerCard = Number(formData.pills_per_card) || 1;
    let finalQuantity = Number(formData.quantity);
    
    if (editingItem) {
      // If editing an existing item, final stock is current adjusted pills + any added cards
      finalQuantity += Number(formData.cards_to_add) * pillsPerCard;
    } else {
      // If creating a new item, final stock is initial cards * pills_per_card
      finalQuantity = Number(formData.initial_cards) * pillsPerCard;
    }

    const payload = {
      category_id: Number(formData.category_id),
      brand_name: formData.brand_name.trim(),
      name: formData.name,
      pin_number: formData.pin_number,
      price_per_card: Number(formData.price_per_card),
      price_per_pill: Number(formData.price_per_pill),
      pills_per_card: pillsPerCard,
      quantity: finalQuantity,
      low_stock_threshold: Number(formData.low_stock_threshold)
    };

    try {
      if (editingItem) {
        await api.put(`/items/${editingItem.id}`, payload);
      } else {
        await api.post('/items', payload);
      }
      
      setModalOpen(false);
      fetchItems();
      fetchBrands(); // Refresh brands cache in case a new one was added
    } catch (err: any) {
      const apiErr = err as ApiError;
      setModalError(apiErr.message || 'Validation error occurred.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this medication?')) return;
    try {
      await api.delete(`/items/${id}`);
      fetchItems();
    } catch (err: any) {
      const apiErr = err as ApiError;
      alert(apiErr.message || 'Cannot delete item.');
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
      
      {/* Search and Action Header */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by name, brand, or pin SKU..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.5rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              className="form-control"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '0.65rem', minWidth: '150px' }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button 
            className="btn btn-secondary"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            style={{ 
              borderColor: showLowStockOnly ? 'var(--accent-orange)' : 'var(--border-color)',
              color: showLowStockOnly ? 'var(--accent-orange)' : 'inherit',
              padding: '0.65rem 1rem'
            }}
          >
            <AlertTriangle size={16} />
            {showLowStockOnly ? 'Showing Alerts Only' : 'Show Stock Alerts'}
          </button>
        </div>

        {isSuperAdmin && (
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            Add Medication
          </button>
        )}
      </div>

      {/* Grid List Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="var(--accent-cyan)" /> Medicine Stock Ledger
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading inventory database...
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No medicines listed. Add your first medicine item.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Barcode PIN</th>
                  <th>Medication Name</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Price Details</th>
                  <th>Stock Quantity</th>
                  <th>Alert Level</th>
                  {isSuperAdmin && <th style={{ textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isOutOfStock = item.quantity === 0;
                  const isLowStock = item.quantity <= item.low_stock_threshold;
                  
                  return (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'Courier New, monospace', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {item.pin_number}
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.brand?.name || 'N/A'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.category?.name}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>LKR {Number(item.price_per_card).toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>/card</span></div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>LKR {Number(item.price_per_pill).toFixed(2)} /pill</div>
                      </td>
                      <td>
                        {isOutOfStock ? (
                          <span className="badge badge-danger">OUT OF STOCK</span>
                        ) : isLowStock ? (
                          <span className="badge badge-warning">{formatStock(item.quantity, item.pills_per_card)}</span>
                        ) : (
                          <span className="badge badge-success">{formatStock(item.quantity, item.pills_per_card)}</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        Threshold: {item.low_stock_threshold} pills
                      </td>
                      {isSuperAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button 
                              className="qty-btn"
                              style={{ width: '32px', height: '32px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                              onClick={() => openEditModal(item)}
                              title="Edit item"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              className="qty-btn" 
                              style={{ width: '32px', height: '32px', border: 'none', background: 'rgba(244,63,94,0.08)', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                              onClick={() => handleDeleteItem(item.id)}
                              title="Delete item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {meta.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {items.length} of {meta.total} products (Page {meta.current_page} of {meta.last_page})
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setPage(page - 1)} 
                disabled={page <= 1}
                style={{ padding: '0.5rem 1rem' }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setPage(page + 1)} 
                disabled={page >= meta.last_page}
                style={{ padding: '0.5rem 1rem' }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CRUD Modal Dialog */}
      {modalOpen && (
        <div className="modal-overlay animate-fade-in">
          <div className="glass-panel modal-content animate-slide-in" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {editingItem ? 'Edit Medicine Details' : 'Add New Medicine'}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="alert-panel" style={{ marginBottom: '1rem', background: 'rgba(244, 63, 94, 0.08)', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
                <AlertTriangle className="alert-icon" style={{ color: 'var(--accent-red)' }} size={16} />
                <div className="alert-body">
                  <h4 style={{ color: 'var(--accent-red)' }}>Validation Error</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{modalError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Medicine Name</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. Paracetamol 500mg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoComplete="off"
                  required
                />
                
                {/* Autocomplete for existing items */}
                {nameSuggestions.length > 0 && (
                  <div className="glass-panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1100, background: 'var(--bg-surface)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', borderRadius: '8px', border: '1px solid var(--border-color)', maxHeight: '180px', overflowY: 'auto' }}>
                    <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                      Medicine exists. Click to load details and adjust stock:
                    </div>
                    {nameSuggestions.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => loadExistingItemDetails(item)}
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}
                      >
                        <div>
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({item.pin_number})</span>
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>{item.brand?.name || 'No Brand'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Brand Name</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. Pfizer, GSK"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  list="brands-datalist"
                  required
                />
                <datalist id="brands-datalist">
                  {brands.map((b) => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  className="form-control"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Barcode / PIN Number (SKU)</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. 90000001"
                  value={formData.pin_number}
                  onChange={(e) => setFormData({ ...formData, pin_number: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Pills per Card</label>
                  <input 
                    type="number" 
                    min="1"
                    className="form-control"
                    placeholder="e.g. 12"
                    value={formData.pills_per_card}
                    onChange={(e) => setFormData({ ...formData, pills_per_card: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Low Stock Threshold (Pills)</label>
                  <input 
                    type="number" 
                    min="0"
                    className="form-control"
                    placeholder="15"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Price per Card (LKR)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="LKR 24.00"
                    value={formData.price_per_card}
                    onChange={(e) => setFormData({ ...formData, price_per_card: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Price per Pill (LKR)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="LKR 2.00"
                    value={formData.price_per_pill}
                    onChange={(e) => setFormData({ ...formData, price_per_pill: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Stock Management Form Fields */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', margin: 0 }}>Stock Management</h4>
                
                {editingItem ? (
                  <>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Current stock: <strong style={{ color: 'var(--text-primary)' }}>{formatStock(Number(formData.quantity), Number(formData.pills_per_card))}</strong> ({formData.quantity} pills)
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <label style={{ fontSize: '0.75rem' }}>Add Cards to Stock</label>
                        <input 
                          type="number"
                          className="form-control"
                          value={formData.cards_to_add}
                          onChange={(e) => setFormData({ ...formData, cards_to_add: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <label style={{ fontSize: '0.75rem' }}>Adjust Total Pills Stock</label>
                        <input 
                          type="number"
                          min="0"
                          className="form-control"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Initial Cards Count</label>
                    <input 
                      type="number" 
                      min="0"
                      className="form-control"
                      placeholder="e.g. 10 cards"
                      value={formData.initial_cards}
                      onChange={(e) => setFormData({ ...formData, initial_cards: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={submitLoading}
                >
                  {submitLoading ? 'Saving...' : 'Save Medication'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Inventory;
