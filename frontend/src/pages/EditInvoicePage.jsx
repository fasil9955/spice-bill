import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoiceService, productService } from '../services/api';
import { Search, Plus, Minus, ShoppingCart, ArrowLeft, X } from 'lucide-react';
import './Billing.css';

const EditInvoicePage = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amounts, setAmounts] = useState({ cash: 0, card: 0, upi: 0 });
  const [discountAmount, setDiscountAmount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      if (!invoiceId) return;
      setLoading(true);
      try {
        const [invRes, prodRes] = await Promise.all([
          invoiceService.getById(Number(invoiceId)),
          productService.getAll()
        ]);
        const inv = invRes?.data;
        if (!inv) {
          alert('Invoice not found.');
          navigate('/dashboard/bills');
          return;
        }
        if ((inv.invoiceType || 'RETAIL') !== 'RETAIL') {
          alert('Only retail invoices can be edited here. Use B2B Bills for B2B.');
          navigate('/dashboard/bills');
          return;
        }
        if ((inv.status || 'ACTIVE') !== 'ACTIVE') {
          alert('Only active invoices can be edited.');
          navigate('/dashboard/bills');
          return;
        }
        setInvoice(inv);
        setPaymentMethod(inv.paymentMethod || 'CASH');
        setAmounts({
          cash: Number(inv.cashAmount) || 0,
          card: Number(inv.cardAmount) || 0,
          upi: Number(inv.upiAmount) || 0
        });
        setDiscountAmount(Number(inv.discountAmount) || 0);
        setItems((inv.items || []).map(it => ({
          productId: it.product?.productId,
          productName: it.productName || '-',
          unit: it.unit || '',
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0
        })));
        setProducts(Array.isArray(prodRes?.data) ? prodRes.data : []);
      } catch (err) {
        console.error('Failed to load invoice', err);
        alert('Failed to load invoice.');
        navigate('/dashboard/bills');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoiceId, navigate]);

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    const trimmed = (val || '').trim().toLowerCase();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setHighlightedIndex(-1);
      return;
    }
    const filtered = products.filter(p =>
      (p.productName || '').toLowerCase().includes(trimmed) ||
      (p.barcode || '').toLowerCase().includes(trimmed)
    );
    setSearchResults(filtered);
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
  };

  const addProduct = (product, qty = 1) => {
    const existing = items.find(it => it.productId === product.productId);
    if (existing) {
      setItems(prev => prev.map(it =>
        it.productId === product.productId
          ? { ...it, quantity: it.quantity + qty }
          : it
      ));
    } else {
      setItems(prev => [...prev, {
        productId: product.productId,
        productName: product.productName || '-',
        unit: product.unit || '',
        quantity: qty,
        unitPrice: Number(product.sellingPricePerUnit ?? product.unitPrice) || 0
      }]);
    }
    setSearchTerm('');
    setSearchResults([]);
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
  };

  const updateItemQty = (index, delta) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      const newQty = Math.max(0.01, it.quantity + delta);
      return { ...it, quantity: newQty };
    }).filter(it => it.quantity > 0));
  };

  const updateItemField = (index, field, value) => {
    setItems(prev => prev.map((it, i) => i !== index ? it : { ...it, [field]: value }));
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
  const discount = Math.min(Number(discountAmount) || 0, subtotal);
  const total = Math.max(0, subtotal - discount);

  const handleSave = async () => {
    if (!invoice || items.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        paymentMethod,
        cashAmount: paymentMethod === 'MIXED' ? (Number(amounts.cash) || 0) : (paymentMethod === 'CASH' ? total : 0),
        cardAmount: paymentMethod === 'MIXED' ? (Number(amounts.card) || 0) : (paymentMethod === 'CARD' ? total : 0),
        upiAmount: paymentMethod === 'MIXED' ? (Number(amounts.upi) || 0) : (paymentMethod === 'UPI' ? total : 0),
        discountAmount: discount,
        items: items.map(it => ({
          product: { productId: it.productId },
          quantity: it.quantity,
          unitPrice: it.unitPrice
        }))
      };
      await invoiceService.update(invoice.invoiceId, payload);
      navigate('/dashboard/bills');
    } catch (err) {
      console.error('Failed to update invoice', err);
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !invoice) {
    return (
      <div className="billing-container">
        <div className="billing-header">
          <button className="back-button" onClick={() => navigate('/dashboard/bills')}><ArrowLeft size={18} /> Back</button>
          <h1>Edit Invoice</h1>
        </div>
        <p className="loading">Loading...</p>
      </div>
    );
  }

  return (
    <div className="billing-container">
      <div className="billing-header">
        <div className="billing-header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard/bills')}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1>✏️ Edit Invoice #{invoice.invoiceNumber}</h1>
        </div>
        <div className="billing-header-actions">
          <button className="nav-link-button" onClick={() => navigate('/dashboard/bills')}>📚 Bills</button>
          <button className="nav-link-button" onClick={() => navigate('/dashboard/billing')}>🧾 Create Invoice</button>
        </div>
      </div>

      <div className="billing-content">
        <div className="billing-main-content">
          <div className="cart-section">
            <p className="edit-invoice-meta">
              Date: {new Date(invoice.createdAt).toLocaleString()} · Customer: {invoice.b2bCustomer?.customerName || 'Retail'}
            </p>
            <div className="billing-search-bar cart-search-bar">
              <form onSubmit={(e) => { e.preventDefault(); if (searchResults[highlightedIndex]) addProduct(searchResults[highlightedIndex]); }}>
                <Search size={20} className="billing-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="billing-search-input"
                  placeholder="Search product to add..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => (i < searchResults.length - 1 ? i + 1 : 0)); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => (i > 0 ? i - 1 : searchResults.length - 1)); }
                    if (e.key === 'Enter' && searchResults[highlightedIndex]) { e.preventDefault(); addProduct(searchResults[highlightedIndex]); }
                  }}
                  autoComplete="off"
                />
              </form>
              {searchResults.length > 0 && (
                <div className="product-search-dropdown">
                  {searchResults.slice(0, 10).map((p, idx) => (
                    <div
                      key={p.productId}
                      className={`product-search-item select-only ${idx === highlightedIndex ? 'highlighted' : ''}`}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => addProduct(p)}
                    >
                      <div className="product-search-item-info">
                        <span>{p.productName}{p.unit ? ` (${p.unit})` : ''}</span>
                        <span>₹{p.sellingPricePerUnit ?? p.unitPrice}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="section-header">
              <ShoppingCart size={20} />
              <h2>Items ({items.length})</h2>
            </div>
            <div className="cart-table-wrapper">
              <table className="cart-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Unit</th>
                    <th>Price (₹)</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.productName}{it.unit ? ` (${it.unit})` : ''}</td>
                      <td>{it.unit || '-'}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="edit-invoice-input edit-rate"
                          value={it.unitPrice}
                          onChange={(e) => updateItemField(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td>
                        <div className="quantity-control">
                          <button type="button" onClick={() => updateItemQty(idx, -1)} aria-label="Decrease"><Minus size={14}/></button>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            className="quantity-input"
                            value={it.quantity}
                            onChange={(e) => updateItemField(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                          <button type="button" onClick={() => updateItemQty(idx, 1)} aria-label="Increase"><Plus size={14}/></button>
                        </div>
                      </td>
                      <td>₹{(it.quantity * it.unitPrice).toFixed(2)}</td>
                      <td>
                        <button type="button" className="remove-btn" onClick={() => removeItem(idx)} disabled={items.length <= 1}><X size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="totals-section">
            <div className="totals-card">
              <div className="totals-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="totals-row totals-discount edit-discount-row">
                <span>Discount (₹)</span>
                <span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="edit-invoice-input"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  />
                </span>
              </div>
              <div className="totals-row total-amount">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>

              <div className="payment-section">
                <h3>Payment Method</h3>
                <select
                  className="payment-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="MIXED">Mixed</option>
                </select>
                {paymentMethod === 'MIXED' && (
                  <div className="mixed-amounts">
                    <div className="mixed-row"><label>Cash ₹</label><input type="number" min="0" step="0.01" value={amounts.cash || ''} onChange={(e) => setAmounts(a => ({ ...a, cash: parseFloat(e.target.value) || 0 }))} placeholder="0" /></div>
                    <div className="mixed-row"><label>Card ₹</label><input type="number" min="0" step="0.01" value={amounts.card || ''} onChange={(e) => setAmounts(a => ({ ...a, card: parseFloat(e.target.value) || 0 }))} placeholder="0" /></div>
                    <div className="mixed-row"><label>UPI ₹</label><input type="number" min="0" step="0.01" value={amounts.upi || ''} onChange={(e) => setAmounts(a => ({ ...a, upi: parseFloat(e.target.value) || 0 }))} placeholder="0" /></div>
                  </div>
                )}
              </div>

              <button className="submit-btn checkout-btn" onClick={handleSave} disabled={saving || items.length === 0}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button className="secondary-btn" style={{ marginTop: '10px' }} onClick={() => navigate('/dashboard/bills')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditInvoicePage;
