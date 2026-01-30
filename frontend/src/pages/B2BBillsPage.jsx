import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService, authService, courierService } from '../services/api';
import { buildInvoicePrintHtml, printHtmlViaIframe } from '../utils/invoicePrint';
import { ArrowLeft, Search, Printer, Trash2, Eye, Pencil, X, Truck } from 'lucide-react';

const B2BBillsPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
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

  const filteredInvoices = invoices.filter(inv =>
    (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.b2bCustomer?.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.b2bCustomer?.gstNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openViewModal = async (inv) => {
    setSelectedInvoice(null);
    setDetailLoading(true);
    try {
      const res = await invoiceService.getById(inv.invoiceId);
      setSelectedInvoice(res.data);
    } catch (err) {
      console.error('Failed to load invoice', err);
      alert('Failed to load invoice details.');
    } finally {
      setDetailLoading(false);
    }
  };

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
      await invoiceService.requestCancellation(cancelTarget.invoiceId, cancelReason || 'Requested from B2B Bills');
      setCancelTarget(null);
      setCancelReason('');
      setSelectedInvoice(null);
      await fetchInvoices();
    } catch (err) {
      console.error('Cancel request failed', err);
      alert(err.response?.data?.error || 'Failed to request cancellation.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const isActive = (inv) => (inv.status || 'ACTIVE') === 'ACTIVE';

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
                <td>₹{inv.totalAmount.toFixed(2)}</td>
                <td><span className={`status-badge status-${(inv.status || 'ACTIVE').toLowerCase()}`}>{inv.status || 'ACTIVE'}</span></td>
                <td className="action-buttons">
                  <button className="view-btn" title="View" onClick={() => openViewModal(inv)}><Eye size={16}/></button>
                  <button className="edit-btn" title="Edit" onClick={() => navigate(`/dashboard/b2b/edit/${inv.invoiceId}`)}><Pencil size={16}/></button>
                  <button className="print-btn" title="Print" onClick={() => handlePrint(inv)} disabled={printLoading}><Printer size={16}/></button>
                  <button className="courier-btn" title="Add tracking / Courier" onClick={() => openTrackingModal(inv)}><Truck size={16}/></button>
                  {isActive(inv) && (
                    <button className="cancel-btn" title="Request cancel" onClick={() => openCancelModal(inv)}><Trash2 size={16}/></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View / Edit detail modal */}
      {detailLoading && (
        <div className="modal-overlay">
          <div className="modal-content bills-detail-modal"><p>Loading...</p></div>
        </div>
      )}
      {selectedInvoice && !detailLoading && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-content bills-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="bills-detail-header">
              <h2>Invoice {selectedInvoice.invoiceNumber}</h2>
              <button type="button" className="modal-close" onClick={() => setSelectedInvoice(null)}><X size={20}/></button>
            </div>
            <div className="bills-detail-body">
              <p><strong>Date:</strong> {new Date(selectedInvoice.createdAt).toLocaleString()}</p>
              <p><strong>Type:</strong> B2B</p>
              <p><strong>Customer:</strong> {selectedInvoice.b2bCustomer?.customerName || '–'}</p>
              <p><strong>GST:</strong> {selectedInvoice.b2bCustomer?.gstNumber || '–'}</p>
              <p><strong>Payment:</strong> {selectedInvoice.paymentMethod}</p>
              <p><strong>Status:</strong> {selectedInvoice.status || 'ACTIVE'}</p>
              <p><strong>Total:</strong> ₹{Number(selectedInvoice.totalAmount).toFixed(2)}</p>
              {(selectedInvoice.items || []).length > 0 && (
                <table className="bills-detail-items">
                  <thead>
                    <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((it, i) => (
                      <tr key={it.itemId || i}>
                        <td>{it.productName || '-'}</td>
                        <td>{Number(it.quantity)} {it.unit || ''}</td>
                        <td>₹{Number(it.unitPrice).toFixed(2)}</td>
                        <td>₹{Number(it.totalPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="bills-detail-actions">
              <button className="print-btn" onClick={() => handlePrint(selectedInvoice)} disabled={printLoading}>Print</button>
              {isActive(selectedInvoice) && (
                <button className="cancel-btn" onClick={() => { setCancelTarget(selectedInvoice); setCancelReason(''); setSelectedInvoice(null); }}>Request cancel</button>
              )}
              <button className="back-button" onClick={() => setSelectedInvoice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

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

      {/* Cancel reason modal */}
      {cancelTarget && (
        <div className="modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="modal-content bills-cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="bills-detail-header">
              <h2>Request cancellation – {cancelTarget.invoiceNumber}</h2>
              <button type="button" className="modal-close" onClick={() => setCancelTarget(null)}><X size={20}/></button>
            </div>
            <p className="bills-cancel-hint">Reason for cancellation (optional):</p>
            <textarea
              className="bills-cancel-reason"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Duplicate bill, wrong amount..."
              rows={3}
            />
            <div className="bills-detail-actions">
              <button className="cancel-btn" onClick={submitCancel} disabled={cancelSubmitting}>{cancelSubmitting ? 'Submitting...' : 'Submit request'}</button>
              <button className="back-button" onClick={() => { setCancelTarget(null); setCancelReason(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default B2BBillsPage;
