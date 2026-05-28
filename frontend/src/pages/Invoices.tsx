import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  FileText, Search, Printer, Eye, ChevronLeft, 
  ChevronRight, Calendar, User, RefreshCw 
} from 'lucide-react';

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string | null;
  total_amount: string | number;
  discount: string | number;
  tax: string | number;
  net_amount: string | number;
  amount_paid: string | number;
  change_amount: string | number;
  payment_method: string;
  created_at: string;
  user?: {
    name: string;
  };
  items?: Array<{
    id: number;
    quantity: number;
    unit: string;
    price: string | number;
    subtotal: string | number;
    item?: {
      name: string;
      pin_number: string;
      brand?: {
        name: string;
      };
    };
  }>;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

interface InvoicesProps {
  onReprint: (invoice: any) => void;
}

export const Invoices: React.FC<InvoicesProps> = ({ onReprint }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15
  });

  useEffect(() => {
    fetchInvoices();
  }, [page, selectedDate]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchInvoices();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let url = `/invoices?page=${page}&search=${search}&per_page=12`;
      if (selectedDate) {
        url += `&date=${selectedDate}`;
      }
      
      const response = await api.get<any>(url);
      setInvoices(response.data || []);
      setMeta({
        current_page: response.current_page,
        last_page: response.last_page,
        total: response.total,
        per_page: response.per_page
      });
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceDetails = async (id: number) => {
    try {
      const data = await api.get<Invoice>(`/invoices/${id}`);
      setSelectedInvoice(data);
    } catch (err) {
      console.error('Failed to load invoice details', err);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedDate('');
    setPage(1);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: selectedInvoice ? '1.2fr 0.8fr' : '1fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* Invoice Search & Ledger Table */}
      <div className="pos-panel">
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          {/* Text Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search Invoice number or customer..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.5rem' }}
            />
          </div>

          {/* Date Picker Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', minWidth: '200px' }}>
            <Calendar size={16} color="var(--text-muted)" />
            <input 
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: '0.65rem', flex: 1 }}
            />
          </div>

          {/* Clear & Refresh Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handleClearFilters} style={{ padding: '0.65rem 1rem' }} title="Clear Filters">
              Clear
            </button>
            <button className="btn btn-secondary" onClick={fetchInvoices} style={{ padding: '0.65rem 1rem' }} title="Refresh ledger">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="var(--accent-purple)" /> Invoice Billing Records
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading invoice history...
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No invoice records found.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Invoice Key</th>
                    <th>Customer Name</th>
                    <th>Date Issued</th>
                    <th>Issued By</th>
                    <th>Total</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr 
                      key={inv.id} 
                      style={{ 
                        background: selectedInvoice?.id === inv.id ? 'rgba(6, 182, 212, 0.05)' : '',
                        cursor: 'pointer' 
                      }}
                      onClick={() => loadInvoiceDetails(inv.id)}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {inv.invoice_number}
                      </td>
                      <td>{inv.customer_name || <span style={{ color: 'var(--text-muted)' }}>Walk-in Client</span>}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {formatDate(inv.created_at)}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{inv.user?.name}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        LKR {Number(inv.net_amount).toFixed(2)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            className="qty-btn"
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--accent-cyan)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              loadInvoiceDetails(inv.id);
                            }}
                            title="View details"
                          >
                            <Eye size={12} />
                          </button>
                          <button 
                            className="qty-btn"
                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--accent-purple)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onReprint(inv);
                            }}
                            title="Reprint receipt"
                          >
                            <Printer size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Showing {invoices.length} of {meta.total} records (Page {meta.current_page} of {meta.last_page})
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
      </div>

      {/* Right Side: Selected Invoice Detail Pane */}
      {selectedInvoice && (
        <div className="glass-panel animate-slide-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Invoice Details</h3>
              <span style={{ fontFamily: 'Courier New, monospace', fontWeight: 600, color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>
                {selectedInvoice.invoice_number}
              </span>
            </div>
            <button 
              className="qty-btn"
              onClick={() => setSelectedInvoice(null)}
              style={{ border: 'none', background: 'transparent' }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> Date:</span>
              <span style={{ fontWeight: 500 }}>{formatDate(selectedInvoice.created_at)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={14} /> Customer:</span>
              <span style={{ fontWeight: 500 }}>{selectedInvoice.customer_name || 'Walk-in Client'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={14} /> Cashier:</span>
              <span style={{ fontWeight: 500 }}>{selectedInvoice.user?.name || 'Staff'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Payment Method:</span>
              <span className="badge badge-success" style={{ fontWeight: 600 }}>{selectedInvoice.payment_method}</span>
            </div>
          </div>

          {/* Cart items list in the detail panel */}
          <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1rem 0' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Items Purchased</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '220px', overflowY: 'auto' }}>
              {selectedInvoice.items?.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{item.item?.name || 'Deleted product'}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.quantity} {item.unit}(s) × LKR {Number(item.price).toFixed(2)}
                    </div>
                  </div>
                  <span style={{ fontWeight: 700 }}>LKR {Number(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
              <span>LKR {Number(selectedInvoice.total_amount).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Discount:</span>
              <span style={{ color: 'var(--accent-red)' }}>-LKR {Number(selectedInvoice.discount).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tax:</span>
              <span>+LKR {Number(selectedInvoice.tax).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', fontSize: '1.1rem', fontWeight: 800 }}>
              <span>Net Amount:</span>
              <span style={{ color: 'var(--accent-cyan)' }}>LKR {Number(selectedInvoice.net_amount).toFixed(2)}</span>
            </div>

            {selectedInvoice.payment_method === 'Cash' && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cash Received:</span>
                  <span>LKR {Number(selectedInvoice.amount_paid).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Change Returned:</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>LKR {Number(selectedInvoice.change_amount).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <button 
            className="btn btn-primary" 
            onClick={() => onReprint(selectedInvoice)}
            style={{ width: '100%' }}
          >
            <Printer size={16} /> Reprint Receipt
          </button>
        </div>
      )}

    </div>
  );
};
export default Invoices;
