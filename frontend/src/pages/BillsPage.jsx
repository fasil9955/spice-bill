import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '../services/api';
import { ArrowLeft, Search, Printer, Trash2, Eye } from 'lucide-react';

const BillsPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    try {
      const response = await invoiceService.getAll();
      if (Array.isArray(response.data)) {
        setInvoices(response.data);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.error('Failed to fetch invoices', err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter(inv => 
    (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.b2bCustomer?.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bills-container">
      <div className="bills-header">
        <div>
          <h1>📚 Bills History</h1>
          <p>View and manage all previous invoices</p>
        </div>
        <div className="bills-header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
        </div>
      </div>

      <div className="bills-actions">
        <div className="search-bar">
          <input 
            type="text" 
            className="search-input"
            placeholder="Search invoice number or customer..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bills-table-container">
        <table className="bills-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Inv #</th>
              <th>Type</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="loading">Loading bills...</td></tr>
            ) : filteredInvoices.length === 0 ? (
              <tr><td colSpan="7" className="no-data">No invoices found</td></tr>
            ) : filteredInvoices.map(inv => (
              <tr key={inv.invoiceId}>
                <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                <td>{inv.invoiceNumber}</td>
                <td><span className="type-badge">{inv.invoiceType}</span></td>
                <td>{inv.b2bCustomer?.customerName || 'Retail'}</td>
                <td>₹{inv.totalAmount.toFixed(2)}</td>
                <td><span className={`status-badge status-${(inv.status || 'ACTIVE').toLowerCase()}`}>{inv.status || 'ACTIVE'}</span></td>
                <td className="action-buttons">
                  <button className="view-btn" title="View"><Eye size={16}/></button>
                  <button className="print-btn" title="Print"><Printer size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BillsPage;
