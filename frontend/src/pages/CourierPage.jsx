import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courierService, authService } from '../services/api';
import { printHtmlViaIframe } from '../utils/invoicePrint';
import { ArrowLeft, Pencil, X, Plus, Printer, Trash2 } from 'lucide-react';

const CourierPage = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ customerName: '', address: '', phone1: '', phone2: '', status: 'PENDING', trackingId: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ customerName: '', trackingId: '', invoiceNumber: '', address: '', phone1: '', phone2: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [inlineTracking, setInlineTracking] = useState({});
  const navigate = useNavigate();

  const buildPayload = (c, overrides = {}) => ({
    customerName: (c.customerName || '').trim(),
    address: (c.address || '').trim() || null,
    phone1: (c.phone1 || '').trim() || null,
    phone2: (c.phone2 || '').trim() || null,
    invoiceId: c.invoiceId ?? null,
    invoiceNumber: (c.invoiceNumber || '').trim() || null,
    status: overrides.status !== undefined ? overrides.status : (c.status || 'PENDING'),
    trackingId: overrides.trackingId !== undefined ? (overrides.trackingId || null) : ((c.trackingId || '').trim() || null)
  });

  const saveInline = async (c, overrides) => {
    setSavingId(c.courierId);
    try {
      await courierService.update(c.courierId, buildPayload(c, overrides));
      await fetchCouriers();
      if (overrides.trackingId !== undefined) {
        setInlineTracking(prev => {
          const next = { ...prev };
          delete next[c.courierId];
          return next;
        });
      }
    } catch (err) {
      console.error('Inline update failed', err);
      alert(err.response?.data?.error || 'Failed to update.');
    } finally {
      setSavingId(null);
    }
  };

  const fetchCouriers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await courierService.getAll();
      const data = response?.data;
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch courier requests', err);
      setError(err.response?.data?.error || 'Failed to load courier requests.');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouriers();
  }, []);

  const filtered = list.filter(c =>
    (c.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.trackingId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEdit = (c) => {
    setEditTarget(c);
    setEditForm({
      customerName: c.customerName || '',
      address: c.address || '',
      phone1: c.phone1 || '',
      phone2: c.phone2 || '',
      status: c.status || 'PENDING',
      trackingId: c.trackingId || ''
    });
  };

  const closeEdit = () => {
    setEditTarget(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await courierService.update(editTarget.courierId, {
        customerName: (editForm.customerName || '').trim(),
        address: (editForm.address || '').trim() || null,
        phone1: (editForm.phone1 || '').trim() || null,
        phone2: (editForm.phone2 || '').trim() || null,
        status: (editForm.status || 'PENDING').trim(),
        trackingId: (editForm.trackingId || '').trim() || null,
        invoiceId: editTarget.invoiceId,
        invoiceNumber: editTarget.invoiceNumber || ''
      });
      await fetchCouriers();
      closeEdit();
    } catch (err) {
      console.error('Update failed', err);
      alert(err.response?.data?.error || 'Failed to update courier request.');
    } finally {
      setEditSaving(false);
    }
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setAddForm({ customerName: '', trackingId: '', invoiceNumber: '', address: '', phone1: '', phone2: '' });
  };

  const closeAddModal = () => setShowAddModal(false);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const name = (addForm.customerName || '').trim();
    if (!name) {
      alert('Customer name is required.');
      return;
    }
    setAddSaving(true);
    try {
      await courierService.create({
        customerName: name,
        address: (addForm.address || '').trim() || null,
        phone1: (addForm.phone1 || '').trim() || null,
        phone2: (addForm.phone2 || '').trim() || null,
        invoiceId: null,
        invoiceNumber: (addForm.invoiceNumber || '').trim() || null,
        status: 'PENDING',
        trackingId: (addForm.trackingId || '').trim() || null
      });
      await fetchCouriers();
      closeAddModal();
      alert('Courier request created.');
    } catch (err) {
      console.error('Create failed', err);
      alert(err.response?.data?.error || 'Failed to create courier request.');
    } finally {
      setAddSaving(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '–';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '–' : dt.toLocaleString();
  };

  const buildAddressLabelHtml = (company, courier) => {
    const fromName = (company?.companyName || 'Our Company').replace(/</g, '&lt;');
    const fromAddr = (company?.address || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>');
    const fromPin = (company?.pincode || company?.pin || '').replace(/</g, '&lt;');
    const fromPhone = (company?.phoneNumber || company?.phone || '').replace(/</g, '&lt;');
    const toName = (courier?.customerName || 'Customer').replace(/</g, '&lt;');
    const toAddr = (courier?.address || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>');
    const toPhones = [courier?.phone1, courier?.phone2].filter(Boolean).join(', ').replace(/</g, '&lt;');
    const tracking = (courier?.trackingId || '').replace(/</g, '&lt;');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Courier Label</title><style>
      body { font-family: Arial, sans-serif; font-size: 16px; padding: 16px; max-width: 400px; }
      .label-section { margin-bottom: 24px; }
      .label-section h3 { margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: #444; }
      .label-section .content { line-height: 1.5; padding-left: 2em; font-size: 16px; }
      .label-section .content strong { display: block; margin-bottom: 4px; font-size: 18px; }
      .tracking { margin-top: 16px; font-size: 14px; color: #666; }
    </style></head><body>
      <div class="label-section">
        <h3>From&#9;</h3>
        <div class="content">
          <strong>${fromName}</strong>
          ${fromAddr ? fromAddr + '<br/>' : ''}
          ${fromPin ? 'PIN : ' + fromPin + '<br/>' : ''}
          ${fromPhone ? fromPhone : ''}
        </div>
      </div>
      <div class="label-section">
        <h3>To&#9;</h3>
        <div class="content">
          <strong>${toName}</strong>
          ${toAddr ? toAddr + '<br/>' : ''}
          ${toPhones ? toPhones : ''}
        </div>
      </div>
      ${tracking ? '<div class="tracking">Tracking: ' + tracking + '</div>' : ''}
    </body></html>`;
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete courier request for ${c.customerName || 'this customer'}?`)) return;
    try {
      await courierService.delete(c.courierId);
      await fetchCouriers();
    } catch (err) {
      console.error('Delete failed', err);
      alert(err.response?.data?.error || 'Failed to delete courier request.');
    }
  };

  const handlePrintAddress = async (c) => {
    try {
      const companyRes = await authService.getCompanyDetails();
      const company = companyRes?.data || {};
      const html = buildAddressLabelHtml(company, c);
      printHtmlViaIframe(html);
    } catch (err) {
      console.error('Failed to load company for label', err);
      const html = buildAddressLabelHtml({}, c);
      printHtmlViaIframe(html);
    }
  };

  return (
    <div className="bills-container">
      <div className="bills-header">
        <h1>Courier Requests</h1>
        <div className="bills-header-actions">
          <button type="button" className="print-btn" onClick={openAddModal}>
            <Plus size={18} /> Add courier request
          </button>
          <button type="button" className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
        </div>
      </div>

      {error && <p className="courier-error" style={{ color: '#c00', margin: '0 1rem 1rem' }}>{error}</p>}

      <div className="bills-actions">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by invoice, customer or tracking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bills-table-container">
        <table className="bills-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Inv #</th>
              <th>Customer</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Tracking ID</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="loading">Loading courier requests...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="9" className="no-data">No courier requests found</td></tr>
            ) : filtered.map(c => (
              <tr key={c.courierId}>
                <td>{formatDate(c.createdAt)}</td>
                <td>{c.invoiceNumber || '–'}</td>
                <td>{c.customerName || '–'}</td>
                <td className="cell-address">{(c.address || '–').slice(0, 40)}{(c.address || '').length > 40 ? '…' : ''}</td>
                <td>{[c.phone1, c.phone2].filter(Boolean).join(' / ') || '–'}</td>
                <td className="cell-tracking">
                  <input
                    type="text"
                    className="courier-inline-tracking"
                    value={inlineTracking[c.courierId] !== undefined ? inlineTracking[c.courierId] : (c.trackingId || '')}
                    onChange={e => setInlineTracking(prev => ({ ...prev, [c.courierId]: e.target.value }))}
                    onBlur={() => {
                      const v = inlineTracking[c.courierId] !== undefined ? inlineTracking[c.courierId] : (c.trackingId || '');
                      const trimmed = (v || '').trim();
                      if (trimmed !== (c.trackingId || '').trim()) saveInline(c, { trackingId: trimmed || null });
                      setInlineTracking(prev => {
                        const next = { ...prev };
                        delete next[c.courierId];
                        return next;
                      });
                    }}
                    onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                    placeholder="AWB / tracking"
                    disabled={savingId === c.courierId}
                    title="Edit tracking ID here"
                  />
                </td>
                <td className="cell-status">
                  <select
                    className="courier-inline-status"
                    value={c.status || 'PENDING'}
                    onChange={e => saveInline(c, { status: e.target.value })}
                    disabled={savingId === c.courierId}
                    title="Change status"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="SHIPPED">SHIPPED</option>
                  </select>
                  {savingId === c.courierId && <span className="courier-saving"> Saving…</span>}
                </td>
                <td>{formatDate(c.updatedAt)}</td>
                <td className="action-buttons">
                  <button type="button" className="print-btn" title="Print address label" onClick={() => handlePrintAddress(c)}><Printer size={16}/></button>
                  <button type="button" className="edit-btn" title="Edit" onClick={() => openEdit(c)}><Pencil size={16}/></button>
                  <button type="button" className="cancel-btn" title="Delete" onClick={() => handleDelete(c)}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add courier request modal – directly add tracking ID */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal-content bills-detail-modal bills-courier-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="bills-detail-header">
              <h2>Add courier request</h2>
              <button type="button" className="modal-close" onClick={closeAddModal}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddSubmit} className="bills-courier-form">
              <p className="bills-courier-hint">Add a new courier request. Customer name is required; you can add or update address and phone later.</p>
              <div className="form-group">
                <label>Customer name <span style={{ color: '#c00' }}>*</span></label>
                <input
                  type="text"
                  value={addForm.customerName}
                  onChange={e => setAddForm(f => ({ ...f, customerName: e.target.value }))}
                  placeholder="Customer or recipient name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Tracking ID</label>
                <input
                  type="text"
                  value={addForm.trackingId}
                  onChange={e => setAddForm(f => ({ ...f, trackingId: e.target.value }))}
                  placeholder="AWB or tracking code"
                />
              </div>
              <div className="form-group">
                <label>Invoice number (optional)</label>
                <input
                  type="text"
                  value={addForm.invoiceNumber}
                  onChange={e => setAddForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                  placeholder="e.g. INV-1001"
                />
              </div>
              <div className="form-group">
                <label>Address (optional)</label>
                <textarea
                  value={addForm.address}
                  onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Delivery address"
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Phone 1 (optional)</label>
                <input
                  type="text"
                  value={addForm.phone1}
                  onChange={e => setAddForm(f => ({ ...f, phone1: e.target.value }))}
                  placeholder="Contact number"
                />
              </div>
              <div className="form-group">
                <label>Phone 2 (optional)</label>
                <input
                  type="text"
                  value={addForm.phone2}
                  onChange={e => setAddForm(f => ({ ...f, phone2: e.target.value }))}
                />
              </div>
              <div className="bills-detail-actions">
                <button type="submit" className="print-btn" disabled={addSaving}>{addSaving ? 'Creating...' : 'Create'}</button>
                <button type="button" className="back-button" onClick={closeAddModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-content bills-detail-modal bills-courier-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="bills-detail-header">
              <h2>Edit courier – {editTarget.invoiceNumber || editTarget.courierId}</h2>
              <button type="button" className="modal-close" onClick={closeEdit}><X size={20}/></button>
            </div>
            <form onSubmit={handleEditSubmit} className="bills-courier-form">
              <div className="form-group">
                <label>Customer name</label>
                <input
                  type="text"
                  value={editForm.customerName}
                  onChange={e => setEditForm(f => ({ ...f, customerName: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={editForm.address}
                  onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Phone 1</label>
                <input
                  type="text"
                  value={editForm.phone1}
                  onChange={e => setEditForm(f => ({ ...f, phone1: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Phone 2</label>
                <input
                  type="text"
                  value={editForm.phone2}
                  onChange={e => setEditForm(f => ({ ...f, phone2: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Tracking ID</label>
                <input
                  type="text"
                  value={editForm.trackingId}
                  onChange={e => setEditForm(f => ({ ...f, trackingId: e.target.value }))}
                  placeholder="AWB or tracking code"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="SHIPPED">SHIPPED</option>
                </select>
              </div>
              <div className="bills-detail-actions">
                <button type="submit" className="print-btn" disabled={editSaving}>{editSaving ? 'Saving...' : 'Save'}</button>
                <button type="button" className="back-button" onClick={closeEdit}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierPage;
