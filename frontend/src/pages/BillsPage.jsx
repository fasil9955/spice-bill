import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService, authService, courierService } from '../services/api';
import { buildInvoicePrintHtml, printHtmlViaIframe } from '../utils/invoicePrint';
import { ArrowLeft, Search, Printer, Trash2, Truck, Pencil, X, Plus } from 'lucide-react';

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const BillsPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [courierTarget, setCourierTarget] = useState(null);
  const [courierForm, setCourierForm] = useState({ customerName: '', address: '', phone: '' });
  const [courierSubmitting, setCourierSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = selectedDate
        ? await invoiceService.getByDate(selectedDate)
        : await invoiceService.getAll();
      const list = Array.isArray(response.data) ? response.data : [];
      setInvoices(list.filter(inv => (inv.invoiceType || 'RETAIL') === 'RETAIL'));
    } catch (err) {
      console.error('Failed to fetch invoices', err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [selectedDate]);

  const filteredInvoices = invoices.filter(inv =>
    (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.b2bCustomer?.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCourierModal = (inv) => {
    setCourierTarget(inv);
    setCourierForm({ customerName: '', address: '', phone: '' });
  };

  const submitCourier = async (e) => {
    e.preventDefault();
    if (!courierTarget) return;
    const name = (courierForm.customerName || '').trim();
    if (!name) {
      alert('Customer name is required.');
      return;
    }
    setCourierSubmitting(true);
    try {
      await courierService.create({
        customerName: name,
        address: (courierForm.address || '').trim() || null,
        phone1: (courierForm.phone || '').trim() || null,
        phone2: null,
        invoiceId: courierTarget.invoiceId,
        invoiceNumber: courierTarget.invoiceNumber || '',
        status: 'PENDING',
        trackingId: null
      });
      setCourierTarget(null);
      setCourierForm({ customerName: '', address: '', phone: '' });
      alert('Courier request created. You can update it later on the Courier page.');
    } catch (err) {
      console.error('Courier create failed', err);
      alert(err.response?.data?.error || 'Failed to create courier request.');
    } finally {
      setCourierSubmitting(false);
    }
  };

  const handlePrint = async (inv) => {
    setPrintLoading(true);
    try {
      const res = await invoiceService.getById(inv.invoiceId);
      let toPrint = res.data;
      try {
        const companyRes = await authService.getCompanyDetails();
        const company = companyRes?.data || {};
        toPrint = {
          ...toPrint,
          cashier: {
            ...toPrint.cashier,
            companyName: toPrint.cashier?.companyName || company.companyName || 'Our Spices Shop',
            address: toPrint.cashier?.address || company.address || '',
            gstNumber: toPrint.cashier?.gstNumber || company.gstNumber || '',
            phoneNumber: toPrint.cashier?.phoneNumber ?? company.phoneNumber ?? '',
            fssaiLicense: toPrint.cashier?.fssaiLicense ?? company.fssaiLicense ?? ''
          }
        };
      } catch (e) {}
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

  const submitCancel = async () => {
    if (!cancelTarget) return;
    setCancelSubmitting(true);
    try {
      await invoiceService.requestCancellation(cancelTarget.invoiceId, cancelReason || 'Requested from Bills page');
      setCancelTarget(null);
      setCancelReason('');
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
          <h1>📚 Bills</h1>
          <p>View and manage all previous invoices</p>
        </div>
        <div className="bills-header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
          <button className="nav-link-button" onClick={() => navigate('/dashboard/billing')}>
            🧾 Create Invoice
          </button>
        </div>
      </div>

      <div className="bills-actions">
        <div className="bills-date-filter">
          <label htmlFor="bills-date">Date</label>
          <input
            id="bills-date"
            type="date"
            className="bills-date-input"
            value={selectedDate || ''}
            onChange={(e) => setSelectedDate(e.target.value || getTodayDateString())}
          />
          <button
            type="button"
            className="bills-all-dates-btn"
            onClick={() => setSelectedDate('')}
            title="Show all dates"
          >
            All dates
          </button>
        </div>
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
                  {isActive(inv) && <button className="edit-btn" title="Edit" onClick={() => navigate(`/dashboard/bills/${inv.invoiceId}/edit`)}><Pencil size={20}/></button>}
                  <button className="print-btn" title="Print" onClick={() => handlePrint(inv)} disabled={printLoading}><Printer size={20}/></button>
                  <button className="courier-btn" title="Courier" onClick={() => openCourierModal(inv)}><Truck size={20}/></button>
                  {isActive(inv) && (
                    <button className="cancel-btn" title="Request cancel" onClick={() => openCancelModal(inv)}><Trash2 size={20}/></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Courier modal – customer name, address, phone */}
      {courierTarget && (
        <div className="modal-overlay" onClick={() => setCourierTarget(null)}>
          <div className="modal-content bills-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="bills-detail-header">
              <h2>Courier – Invoice {courierTarget.invoiceNumber}</h2>
              <button type="button" className="modal-close" onClick={() => setCourierTarget(null)}><X size={20}/></button>
            </div>
            <form onSubmit={submitCourier} className="bills-courier-form">
              <p className="bills-courier-hint">Enter delivery details. You can update them later on the Courier page.</p>
              <div className="form-group">
                <label>Customer name *</label>
                <input
                  type="text"
                  value={courierForm.customerName}
                  onChange={e => setCourierForm(f => ({ ...f, customerName: e.target.value }))}
                  placeholder="Name of the customer"
                  required
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={courierForm.address}
                  onChange={e => setCourierForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Delivery address"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Phone number</label>
                <input
                  type="text"
                  value={courierForm.phone}
                  onChange={e => setCourierForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Contact number"
                />
              </div>
              <div className="bills-detail-actions">
                <button type="submit" className="print-btn" disabled={courierSubmitting}>
                  {courierSubmitting ? 'Creating...' : 'Create courier request'}
                </button>
                <button type="button" className="back-button" onClick={() => setCourierTarget(null)}>Cancel</button>
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

export default BillsPage;
