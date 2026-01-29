import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService, authService } from '../services/api';
import { buildInvoicePrintHtml, printHtmlViaIframe } from '../utils/invoicePrint';
import { ArrowLeft, Search, Printer, Eye, CheckCircle, X } from 'lucide-react';

const CancellationRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [approveConfirm, setApproveConfirm] = useState(null);
  const navigate = useNavigate();

  const fetchRequests = async () => {
    try {
      const response = await invoiceService.getCancellationRequests();
      if (Array.isArray(response.data)) {
        setRequests(response.data);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error('Failed to fetch cancellation requests', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter(inv =>
    (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.b2bCustomer?.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
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

  const openApproveConfirm = (inv) => {
    setApproveConfirm(inv);
  };

  const handleApprove = async () => {
    if (!approveConfirm) return;
    const id = approveConfirm.invoiceId;
    setApprovingId(id);
    try {
      await invoiceService.approveCancellation(id);
      setApproveConfirm(null);
      setSelectedInvoice(null);
      await fetchRequests();
    } catch (err) {
      console.error('Approve failed', err);
      alert(err.response?.data?.error || 'Failed to approve cancellation.');
    } finally {
      setApprovingId(null);
    }
  };

  const formatDate = (val) => {
    if (!val) return '–';
    try {
      return new Date(val).toLocaleString();
    } catch {
      return String(val);
    }
  };

  return (
    <div className="bills-container">
      <div className="bills-header">
        <div>
          <h1>⚠️ Cancellation Requests</h1>
          <p>Review and approve invoice cancellation requests</p>
        </div>
        <div className="bills-header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
          <button className="nav-link-button" onClick={() => navigate('/dashboard/bills')}>
            📚 Bills
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
              <th>Requested at</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="loading">Loading cancellation requests...</td></tr>
            ) : filteredRequests.length === 0 ? (
              <tr><td colSpan="8" className="no-data">No pending cancellation requests</td></tr>
            ) : filteredRequests.map(inv => (
              <tr key={inv.invoiceId}>
                <td>{formatDate(inv.createdAt).split(',')[0]}</td>
                <td>{inv.invoiceNumber}</td>
                <td><span className="type-badge">{inv.invoiceType || 'RETAIL'}</span></td>
                <td>{inv.b2bCustomer?.customerName || 'Retail'}</td>
                <td>₹{inv.totalAmount?.toFixed(2) ?? '0.00'}</td>
                <td>{formatDate(inv.cancellationRequestedAt)}</td>
                <td className="reason-cell">{(inv.cancellationReason || '–').slice(0, 40)}{(inv.cancellationReason || '').length > 40 ? '…' : ''}</td>
                <td className="action-buttons">
                  <button className="view-btn" title="View" onClick={() => openViewModal(inv)}><Eye size={16}/></button>
                  <button className="print-btn" title="Print" onClick={() => handlePrint(inv)} disabled={printLoading}><Printer size={16}/></button>
                  <button className="approve-btn" title="Approve cancellation" onClick={() => openApproveConfirm(inv)} disabled={!!approvingId}>
                    <CheckCircle size={16}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View detail modal */}
      {detailLoading && (
        <div className="modal-overlay">
          <div className="modal-content bills-detail-modal"><p>Loading...</p></div>
        </div>
      )}
      {selectedInvoice && !detailLoading && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-content bills-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="bills-detail-header">
              <h2>Invoice {selectedInvoice.invoiceNumber} – Cancellation requested</h2>
              <button type="button" className="modal-close" onClick={() => setSelectedInvoice(null)}><X size={20}/></button>
            </div>
            <div className="bills-detail-body">
              <p><strong>Date:</strong> {formatDate(selectedInvoice.createdAt)}</p>
              <p><strong>Type:</strong> {selectedInvoice.invoiceType || 'RETAIL'}</p>
              <p><strong>Customer:</strong> {selectedInvoice.b2bCustomer?.customerName || 'Retail'}</p>
              <p><strong>Total:</strong> ₹{Number(selectedInvoice.totalAmount).toFixed(2)}</p>
              <p><strong>Requested at:</strong> {formatDate(selectedInvoice.cancellationRequestedAt)}</p>
              <p><strong>Reason:</strong> {selectedInvoice.cancellationReason || '–'}</p>
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
              <button className="approve-btn" onClick={() => { setApproveConfirm(selectedInvoice); setSelectedInvoice(null); }} disabled={!!approvingId}>
                {approvingId === selectedInvoice.invoiceId ? 'Approving...' : 'Approve cancellation'}
              </button>
              <button className="back-button" onClick={() => setSelectedInvoice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve confirmation modal */}
      {approveConfirm && (
        <div className="modal-overlay" onClick={() => setApproveConfirm(null)}>
          <div className="modal-content bills-cancel-modal cancellation-approve-modal" onClick={e => e.stopPropagation()}>
            <div className="bills-detail-header">
              <h2>Approve cancellation</h2>
              <button type="button" className="modal-close" onClick={() => setApproveConfirm(null)}><X size={20}/></button>
            </div>
            <div className="cancellation-approve-body">
              <p>Invoice <strong>{approveConfirm.invoiceNumber}</strong> will be permanently deleted and stock will be restored.</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="bills-detail-actions">
              <button className="approve-btn" onClick={handleApprove} disabled={!!approvingId}>
                {approvingId ? 'Approving...' : 'Approve & delete invoice'}
              </button>
              <button className="back-button" onClick={() => setApproveConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancellationRequestsPage;
