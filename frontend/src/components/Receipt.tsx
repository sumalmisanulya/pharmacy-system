import React from 'react';

interface ReceiptProps {
  invoice: any;
}

export const Receipt: React.FC<ReceiptProps> = ({ invoice }) => {
  if (!invoice) return null;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div id="print-area">
      <div className="print-header">
        <h2>METRO PHARMACY</h2>
        <p>123 Medical Center Ave, Crossroad</p>
        <p>Tel: (555) 019-2834</p>
      </div>
      
      <div className="print-meta">
        <div><strong>Invoice:</strong> {invoice.invoice_number}</div>
        <div><strong>Date:</strong> {formatDate(invoice.created_at)}</div>
        <div><strong>Cashier:</strong> {invoice.user?.name || 'Staff'}</div>
        <div><strong>Customer:</strong> {invoice.customer_name || 'Walk-in Client'}</div>
        <div><strong>Payment:</strong> {invoice.payment_method}</div>
      </div>

      <div className="print-divider"></div>

      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '45%' }}>Item</th>
            <th style={{ width: '20%', textAlign: 'center' }}>Qty</th>
            <th style={{ width: '15%', textAlign: 'right' }}>Price</th>
            <th style={{ width: '20%', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((item: any) => (
            <tr key={item.id}>
              <td>
                {item.item?.name || 'Medicine Item'}
                {item.item?.brand?.name && (
                  <span style={{ fontSize: '7pt', color: '#666', display: 'block' }}>
                    ({item.item.brand.name})
                  </span>
                )}
              </td>
              <td style={{ textAlign: 'center' }}>{item.quantity} {item.unit}</td>
              <td style={{ textAlign: 'right' }}>LKR {Number(item.price).toFixed(2)}</td>
              <td style={{ textAlign: 'right' }}>LKR {Number(item.subtotal).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-divider"></div>

      <div className="print-totals">
        <div>Subtotal: LKR {Number(invoice.total_amount).toFixed(2)}</div>
        {Number(invoice.discount) > 0 && (
          <div>Discount: -LKR {Number(invoice.discount).toFixed(2)}</div>
        )}
        {Number(invoice.tax) > 0 && (
          <div>Tax: +LKR {Number(invoice.tax).toFixed(2)}</div>
        )}
        <div style={{ fontWeight: 'bold', fontSize: '10pt', marginTop: '5px', borderBottom: '1px dashed black', paddingBottom: '5px' }}>
          Net Total: LKR {Number(invoice.net_amount).toFixed(2)}
        </div>
      </div>

      <div style={{ fontSize: '8pt', lineHeight: '1.4', marginTop: '5px', textAlign: 'right' }}>
        <div>Amount Received: LKR {Number(invoice.amount_paid || invoice.net_amount).toFixed(2)}</div>
        <div>Amount Spent: LKR {Number(invoice.net_amount).toFixed(2)}</div>
        <div style={{ fontWeight: 'bold' }}>Change Returned: LKR {Number(invoice.change_amount || 0).toFixed(2)}</div>
      </div>

      <div className="print-footer">
        <p>Thank you for choosing Metro Pharmacy!</p>
        <p>Medicines once sold cannot be returned.</p>
      </div>
    </div>
  );
};
export default Receipt;
