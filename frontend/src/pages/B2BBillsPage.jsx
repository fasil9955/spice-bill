import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService, authService, courierService } from '../services/api';
import { buildInvoicePrintHtml, printHtmlViaIframe } from '../utils/invoicePrint';
import { ArrowLeft, Search, Printer, Trash2, Pencil, X, Truck } from 'lucide-react';

const B2BBillsPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [trackingTarget, setTrackingTarget] = useState(null);
  const [trackingId, setTrackingId] = useState('');
  const [trackingSubmitting, setTrackingSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    try {
      const response = await invoiceService.getB2B();
      if (Array.isArray(response.data)) {
        setInvoices(response.data);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.error('Failed to fetch B2B invoices', err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices
    .filter(inv =>
      (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.b2bCustomer?.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.b2bCustomer?.gstNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handlePrint = async (inv) => {
    setPrintLoading(true);
    try {
      const res = await invoiceService.getById(inv.invoiceId);
      let toPrint = res.data;
      if (!toPrint.cashier?.address || !toPrint.cashier?.gstNumber) {
        try {
          const companyRes = await authService.getCompanyDetails();
          const company = companyRes?.data || {};
          toPrint = {
            ...toPrint,
            cashier: {
              ...toPrint.cashier,
              companyName: toPrint.cashier?.companyName || company.companyName || 'Our Spices Shop',
              address: toPrint.cashier?.address || company.address || '',
              gstNumber: toPrint.cashier?.gstNumber || company.gstNumber || ''
            }
          };
        } catch (e) {}
      }
      const html = buildInvoicePrintHtml(toPrint, { twoCopies: false });
      if (html) printHtmlViaIframe(html);
    } catch (err) {
      console.error('Failed to load invoice for print', err);
      alert('Failed to load invoice for printing.');
    } finally {
      setPrintLoading(false);
    }
  };

  const openCancelModal = (inv) => {
    setCancelTarget(inv);
    setCancelReason('');
  };

  const openTrackingModal = (inv) => {
    setTrackingTarget(inv);
    setTrackingId('');
  };

  const submitTracking = async (e) => {
    e.preventDefault();
    if (!trackingTarget) return;
    setTrackingSubmitting(true);
    try {
      await courierService.create({
        customerName: (trackingTarget.b2bCustomer?.customerName || 'B2B Customer').trim(),
        address: null,
        phone1: null,
        phone2: null,
        invoiceId: trackingTarget.invoiceId,
        invoiceNumber: trackingTarget.invoiceNumber || '',
        status: 'PENDING',
        trackingId: (trackingId || '').trim() || null
      });
      setTrackingTarget(null);
      setTrackingId('');
      alert('Courier request created. You can update tracking and other details on the Courier page.');
    } catch (err) {
      console.error('Courier create failed', err);
      alert(err.response?.data?.error || 'Failed to create courier request.');
    } finally {
      setTrackingSubmitting(false);
    }
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    setCancelSubmitting(true);
    try {
      await invoiceService.deleteB2B(cancelTarget.invoiceId, cancelReason || undefined);
      setCancelTarget(null);
      setCancelReason('');
      await fetchInvoices();
      alert('Invoice marked as cancelled.');
    } catch (err) {
      console.error('Cancel failed', err);
      alert(err.response?.data?.error || 'Failed to cancel invoice.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const isActive = (inv) => (inv.status || 'ACTIVE') === 'ACTIVE';

  /** Total including GST: subtotal + tax - discount (B2B amounts are ex-tax so we add GST). */
  const totalWithGST = (inv) => {
    const sub = Number(inv.subtotal) || 0;
    const tax = Number(inv.taxAmount) || 0;
    const discount = Number(inv.discountAmount) || 0;
    return sub + tax - discount;
  };

  return (
    <div className="bills-container">
      <div className="bills-header">
        <div>
          <h1>🏢 B2B Bills Report</h1>
          <p>View and manage all B2B invoices</p>
        </div>
        <div className="bills-header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
          <button className="nav-link-button" onClick={() => navigate('/dashboard/b2b')}>
            🏢 B2B Billing
          </button>
          <button className="nav-link-button" onClick={() => navigate('/dashboard/bills')}>
            📚 All Bills
          </button>
        </div>
      </div>

      <div className="bills-actions">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search invoice number or customer or GST..."
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
              <th>Customer</th>
              <th>GST</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="loading">Loading B2B bills...</td></tr>
            ) : filteredInvoices.length === 0 ? (
              <tr><td colSpan="7" className="no-data">No B2B invoices found</td></tr>
            ) : filteredInvoices.map(inv => (
              <tr key={inv.invoiceId}>
                <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                <td>{inv.invoiceNumber}</td>
                <td>{inv.b2bCustomer?.customerName || '–'}</td>
                <td>{inv.b2bCustomer?.gstNumber || '–'}</td>
                <td>₹{totalWithGST(inv).toFixed(2)}</td>
                <td><span className={`status-badge status-${(inv.status || 'ACTIVE').toLowerCase()}`}>{inv.status || 'ACTIVE'}</span></td>
                <td className="action-buttons">
                  <button className="edit-btn" title="Edit" onClick={() => navigate(`/dashboard/b2b/edit/${inv.invoiceId}`)}><Pencil size={16}/></button>
                  <button className="print-btn" title="Print" onClick={() => handlePrint(inv)} disabled={printLoading}><Printer size={16}/></button>
                  <button className="courier-btn" title="Add tracking / Courier" onClick={() => openTrackingModal(inv)}><Truck size={16}/></button>
                    {isActive(inv) && (
                    <button className="cancel-btn" title="Cancel (mark as cancelled)" onClick={() => openCancelModal(inv)}><Trash2 size={16}/></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add tracking / Courier modal – tracking details only */}
      {trackingTarget && (
        <div className="modal-overlay" onClick={() => setTrackingTarget(null)}>
          <div className="modal-content bills-detail-modal bills-tracking-modal" onClick={e => e.stopPropagation()}>
            <div className="bills-detail-header">
              <h2>Add tracking – Invoice {trackingTarget.invoiceNumber}</h2>
              <button type="button" className="modal-close" onClick={() => setTrackingTarget(null)}><X size={20}/></button>
            </div>
            <form onSubmit={submitTracking} className="bills-courier-form">
              <p className="bills-courier-hint">Add tracking details for this B2B invoice. You can update address and other details later on the Courier page.</p>
              <div className="form-group">
                <label>Tracking ID</label>
                <input
                  type="text"
                  value={trackingId}
                  onChange={e => setTrackingId(e.target.value)}
                  placeholder="e.g. AWB number or tracking code"
                />
              </div>
              <div className="bills-detail-actions">
                <button type="submit" className="print-btn" disabled={trackingSubmitting}>
                  {trackingSubmitting ? 'Creating...' : 'Create courier request'}
                </button>
                <button type="button" className="back-button" onClick={() => setTrackingTarget(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel bill modal – mark as CANCELLED (stays in DB) */}
      {cancelTarget && (
        <div className="modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="modal-content bills-cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="bills-detail-header">
              <h2>Cancel invoice – {cancelTarget.invoiceNumber}</h2>
              <button type="button" className="modal-close" onClick={() => setCancelTarget(null)}><X size={20}/></button>
            </div>
            <p className="bills-cancel-hint">Mark this invoice as cancelled? It will remain in the list with status &quot;CANCELLED&quot; and will not be deleted from the database.</p>
            <p className="bills-cancel-hint">Reason (optional):</p>
            <textarea
              className="bills-cancel-reason"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Duplicate bill, wrong amount..."
              rows={2}
            />
            <div className="bills-detail-actions">
              <button className="cancel-btn" onClick={submitCancel} disabled={cancelSubmitting}>{cancelSubmitting ? 'Cancelling...' : 'Mark as cancelled'}</button>
              <button className="back-button" onClick={() => { setCancelTarget(null); setCancelReason(''); }}>Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default B2BBillsPage;
