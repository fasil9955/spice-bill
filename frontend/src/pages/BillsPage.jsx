import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService, authService, productService } from '../services/api';
import { buildInvoicePrintHtml, printHtmlViaIframe } from '../utils/invoicePrint';
import { ArrowLeft, Search, Printer, Trash2, Eye, Pencil, X, Plus } from 'lucide-react';

const BillsPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
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

  const openViewModal = async (inv) => {
    setSelectedInvoice(null);
    setEditForm(null);
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

  const openEditModal = async (inv) => {
    if ((inv.status || 'ACTIVE') !== 'ACTIVE') return;
    setSelectedInvoice(null);
    setEditForm(null);
    setDetailLoading(true);
    try {
      const res = await invoiceService.getById(inv.invoiceId);
      const invData = res.data;
      setSelectedInvoice(invData);
      setEditForm({
        paymentMethod: invData.paymentMethod || 'CASH',
        cashAmount: Number(invData.cashAmount) || 0,
        cardAmount: Number(invData.cardAmount) || 0,
        upiAmount: Number(invData.upiAmount) || 0,
        discountAmount: Number(invData.discountAmount) || 0,
        items: (invData.items || []).map(it => ({
          productId: it.product?.productId,
          productName: it.productName || '-',
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0
        }))
      });
      const prodRes = await productService.getAll();
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
    } catch (err) {
      console.error('Failed to load invoice for edit', err);
      alert('Failed to load invoice details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateEditItem = (index, field, value) => {
    if (!editForm) return;
    const next = editForm.items.map((it, i) => i === index ? { ...it, [field]: value } : it);
    setEditForm({ ...editForm, items: next });
  };

  const removeEditItem = (index) => {
    if (!editForm || editForm.items.length <= 1) return;
    setEditForm({ ...editForm, items: editForm.items.filter((_, i) => i !== index) });
  };

  const addEditItem = (product) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      items: [...editForm.items, { productId: product.productId, productName: product.productName, quantity: 1, unitPrice: Number(product.sellingPricePerUnit) || 0 }]
    });
    setAddProductOpen(false);
  };

  const saveEdit = async () => {
    if (!selectedInvoice || !editForm || editForm.items.length === 0) return;
    setEditSaving(true);
    try {
      const payload = {
        paymentMethod: editForm.paymentMethod,
        cashAmount: editForm.cashAmount,
        cardAmount: editForm.cardAmount,
        upiAmount: editForm.upiAmount,
        discountAmount: editForm.discountAmount,
        items: editForm.items.map(it => ({ product: { productId: it.productId }, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) }))
      };
      const res = await invoiceService.update(selectedInvoice.invoiceId, payload);
      setSelectedInvoice(res.data);
      setEditForm(null);
      setAddProductOpen(false);
      await fetchInvoices();
    } catch (err) {
      console.error('Failed to update invoice', err);
      alert(err.response?.data?.error || err.message || 'Failed to update invoice.');
    } finally {
      setEditSaving(false);
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

  const submitCancel = async () => {
    if (!cancelTarget) return;
    setCancelSubmitting(true);
    try {
      await invoiceService.requestCancellation(cancelTarget.invoiceId, cancelReason || 'Requested from Bills page');
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
                  <button className="view-btn" title="View" onClick={() => openViewModal(inv)}><Eye size={16}/></button>
                  {isActive(inv) && <button className="edit-btn" title="Edit" onClick={() => openEditModal(inv)}><Pencil size={16}/></button>}
                  <button className="print-btn" title="Print" onClick={() => handlePrint(inv)} disabled={printLoading}><Printer size={16}/></button>
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
        <div className="modal-overlay" onClick={() => { setSelectedInvoice(null); setEditForm(null); setAddProductOpen(false); }}>
          <div className="modal-content bills-detail-modal bills-detail-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="bills-detail-header">
              <h2>{editForm ? 'Edit Bill' : 'Invoice'} {selectedInvoice.invoiceNumber}</h2>
              <button type="button" className="modal-close" onClick={() => { setSelectedInvoice(null); setEditForm(null); setAddProductOpen(false); }}><X size={20}/></button>
            </div>
            <div className="bills-detail-body">
              {editForm ? (
                <>
                  <p><strong>Date:</strong> {new Date(selectedInvoice.createdAt).toLocaleString()}</p>
                  <p><strong>Type:</strong> {selectedInvoice.invoiceType}</p>
                  <p><strong>Customer:</strong> {selectedInvoice.b2bCustomer?.customerName || 'Retail'}</p>
                  <div className="bills-edit-row">
                    <label><strong>Payment method</strong></label>
                    <select
                      value={editForm.paymentMethod}
                      onChange={e => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                      className="bills-edit-select"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="UPI">UPI</option>
                      <option value="MIXED">Mixed</option>
                    </select>
                  </div>
                  {editForm.paymentMethod === 'MIXED' && (
                    <div className="bills-edit-mixed">
                      <label>Cash ₹ <input type="number" min="0" step="0.01" value={editForm.cashAmount} onChange={e => setEditForm({ ...editForm, cashAmount: parseFloat(e.target.value) || 0 })} className="bills-edit-input" /></label>
                      <label>Card ₹ <input type="number" min="0" step="0.01" value={editForm.cardAmount} onChange={e => setEditForm({ ...editForm, cardAmount: parseFloat(e.target.value) || 0 })} className="bills-edit-input" /></label>
                      <label>UPI ₹ <input type="number" min="0" step="0.01" value={editForm.upiAmount} onChange={e => setEditForm({ ...editForm, upiAmount: parseFloat(e.target.value) || 0 })} className="bills-edit-input" /></label>
                    </div>
                  )}
                  <div className="bills-edit-row">
                    <label><strong>Discount (₹)</strong></label>
                    <input type="number" min="0" step="0.01" value={editForm.discountAmount} onChange={e => setEditForm({ ...editForm, discountAmount: parseFloat(e.target.value) || 0 })} className="bills-edit-input" />
                  </div>
                  <div className="bills-edit-items-header">
                    <strong>Items</strong>
                    <button type="button" className="bills-add-item-btn" onClick={() => setAddProductOpen(!addProductOpen)}><Plus size={16}/> Add item</button>
                  </div>
                  {addProductOpen && products.length > 0 && (
                    <div className="bills-add-product-list">
                      {products.slice(0, 20).map(p => (
                        <button key={p.productId} type="button" className="bills-add-product-item" onClick={() => addEditItem(p)}>
                          {p.productName} – ₹{Number(p.sellingPricePerUnit).toFixed(2)}
                        </button>
                      ))}
                    </div>
                  )}
                  <table className="bills-detail-items bills-edit-items">
                    <thead>
                      <tr><th>Item</th><th>Qty</th><th>Rate (₹)</th><th>Amount</th><th></th></tr>
                    </thead>
                    <tbody>
                      {editForm.items.map((it, i) => (
                        <tr key={i}>
                          <td>{it.productName}</td>
                          <td><input type="number" min="0.01" step="0.01" value={it.quantity} onChange={e => updateEditItem(i, 'quantity', parseFloat(e.target.value) || 0)} className="bills-edit-qty" /></td>
                          <td><input type="number" min="0" step="0.01" value={it.unitPrice} onChange={e => updateEditItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} className="bills-edit-rate" /></td>
                          <td>₹{(it.quantity * it.unitPrice).toFixed(2)}</td>
                          <td><button type="button" className="bills-remove-item" onClick={() => removeEditItem(i)} title="Remove"><X size={14}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  <p><strong>Date:</strong> {new Date(selectedInvoice.createdAt).toLocaleString()}</p>
                  <p><strong>Type:</strong> {selectedInvoice.invoiceType}</p>
                  <p><strong>Customer:</strong> {selectedInvoice.b2bCustomer?.customerName || 'Retail'}</p>
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
                </>
              )}
            </div>
            <div className="bills-detail-actions">
              {editForm ? (
                <>
                  <button className="print-btn" onClick={saveEdit} disabled={editSaving || editForm.items.length === 0}>{editSaving ? 'Saving...' : 'Save changes'}</button>
                  <button className="back-button" onClick={() => { setEditForm(null); setAddProductOpen(false); }}>Cancel edit</button>
                </>
              ) : (
                <>
                  <button className="print-btn" onClick={() => handlePrint(selectedInvoice)} disabled={printLoading}>Print</button>
                  {isActive(selectedInvoice) && (
                    <button className="cancel-btn" onClick={() => { setCancelTarget(selectedInvoice); setCancelReason(''); setSelectedInvoice(null); }}>Request cancel</button>
                  )}
                  <button className="back-button" onClick={() => setSelectedInvoice(null)}>Close</button>
                </>
              )}
            </div>
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
