import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoiceService, productService } from '../services/api';
import { Search, Plus, Minus, ShoppingCart, ArrowLeft, X } from 'lucide-react';
import './Billing.css';
import {
  getEditInvoiceMaxQty,
  wouldExceedStock,
  wouldExceedStockDirect,
} from '../utils/stockValidation';
import InsufficientStockModal from '../components/InsufficientStockModal';

const DISCOUNT_PERCENT_MAX = 30;

/** Parse quantity string without spurious binary float (e.g. 0.125 stays 0.125). */
const parseQty = (raw) => {
  if (raw == null || raw === '') return NaN;
  const s = String(raw).trim().replace(',', '.');
  if (s === '' || s === '.') return NaN;
  // Prefer decimal string path — avoids Number() mangling where possible
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return n;
};

/** Stable display for qty inputs (keeps 0.125 as "0.125", not "0.13" / "0.3"). */
const formatQtyDisplay = (q) => {
  if (q == null || q === '') return '';
  if (typeof q === 'string') {
    const t = q.trim();
    if (t === '' || t === '.') return t;
    // Keep user-typed / API string when it already looks like a decimal
    if (/^-?\d+(\.\d+)?$/.test(t)) return t.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '').replace(/\.$/, '') || '0';
  }
  const n = Number(q);
  if (!Number.isFinite(n)) return '';
  // Up to 6 dp, strip trailing zeros — never round down to 2 dp
  return n
    .toFixed(6)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '');
};

const EditInvoicePage = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amounts, setAmounts] = useState({ cash: 0, card: 0, upi: 0 });
  const [discountType, setDiscountType] = useState('amount');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedForCart, setSelectedForCart] = useState(null);
  const [selectedQtyInput, setSelectedQtyInput] = useState('1');
  const [editingQty, setEditingQty] = useState({});
  const searchInputRef = useRef(null);
  const selectedQtyRef = useRef(null);
  const insufficientRetryRef = useRef(null);
  /** Original invoiced qty per product — used with current DB stock for edit limits */
  const initialInvoiceQtyByProductIdRef = useRef({});
  const [insufficientStockContext, setInsufficientStockContext] = useState(null);

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
        const disc = Number(inv.discountAmount) || 0;
        setDiscountAmount(disc);
        setDiscountPercent(0);
        setDiscountType('amount');
        const mapped = (inv.items || []).map(it => {
          // Keep API decimal text when present (BigDecimal serializes as number/string)
          const rawQty = it.quantity;
          const qtyNum = parseQty(rawQty);
          return {
            productId: it.product?.productId,
            productName: it.productName || '-',
            unit: it.unit || '',
            quantity: Number.isFinite(qtyNum) ? qtyNum : 0,
            quantityText: formatQtyDisplay(rawQty),
            unitPrice: Number(it.unitPrice) || 0
          };
        });
        const qtyMap = {};
        for (const row of mapped) {
          if (!row.productId) continue;
          qtyMap[row.productId] = (qtyMap[row.productId] || 0) + (Number(row.quantity) || 0);
        }
        initialInvoiceQtyByProductIdRef.current = qtyMap;
        setItems(mapped);
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
    if (trimmed.length < 1) {
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

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const getDiscountValue = () => {
    const sub = subtotal;
    if (discountType === 'percent') {
      const pct = Math.min(Number(discountPercent) || 0, DISCOUNT_PERCENT_MAX);
      return (sub * pct) / 100;
    }
    return Math.min(Number(discountAmount) || 0, sub);
  };

  const discount = getDiscountValue();
  const total = Math.max(0, subtotal - discount);

  /** Add or merge line; newest / last added appears at top */
  const addLineToCart = (product, qtyNum, productStockOverride = null) => {
    const q = typeof qtyNum === 'number' && Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1;
    setItems(prev => {
      const idx = prev.findIndex(it => it.productId === product.productId);
      const currentInCart = idx >= 0 ? Number(prev[idx].quantity) || 0 : 0;
      const maxAllowed = getEditInvoiceMaxQty(
        products,
        product.productId,
        initialInvoiceQtyByProductIdRef.current,
        productStockOverride ?? product
      );
      if (wouldExceedStock(maxAllowed, currentInCart, q)) {
        insufficientRetryRef.current = { type: 'EDIT_ADD_LINE', qty: q, productSnapshot: product };
        setInsufficientStockContext({
          product,
          ceiling: maxAllowed,
          requestedTotalQty: currentInCart + q,
        });
        return prev;
      }
      if (idx >= 0) {
        const row = prev[idx];
        const mergedQty = (Number(row.quantity) || 0) + q;
        const newRow = { ...row, quantity: mergedQty, quantityText: formatQtyDisplay(mergedQty) };
        return [newRow, ...prev.filter((_, i) => i !== idx)];
      }
      return [{
        productId: product.productId,
        productName: product.productName || '-',
        unit: product.unit || '',
        quantity: q,
        quantityText: formatQtyDisplay(q),
        unitPrice: Number(product.sellingPricePerUnit ?? product.unitPrice) || 0
      }, ...prev];
    });
    setSearchTerm('');
    setSearchResults([]);
    setHighlightedIndex(-1);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const tryAddSelectedToCart = () => {
    if (!selectedForCart) return;
    const trimmed = (selectedQtyInput || '').trim();
    if (trimmed === '') {
      alert('Please enter a quantity.');
      return;
    }
    const num = parseQty(trimmed);
    if (!Number.isFinite(num) || num <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }
    addLineToCart(selectedForCart, num);
    setSelectedForCart(null);
    setSelectedQtyInput('1');
    searchInputRef.current?.focus();
  };

  const handleInsufficientStockResolved = (freshProduct) => {
    const r = insufficientRetryRef.current;
    insufficientRetryRef.current = null;
    setInsufficientStockContext(null);
    if (!freshProduct || !r) return;
    setProducts(prev => prev.map(p => (p.productId === freshProduct.productId ? { ...p, ...freshProduct } : p)));
    if (r.type === 'EDIT_ADD_LINE') {
      addLineToCart(r.productSnapshot, r.qty, freshProduct);
    } else if (r.type === 'EDIT_SET_QTY') {
      setItems(prev => prev.map(it =>
        it.productId === r.productId
          ? { ...it, quantity: r.newQty, quantityText: formatQtyDisplay(r.newQty) }
          : it
      ));
    }
  };

  const runSearchSubmit = async () => {
    const rawInput = searchInputRef.current?.value;
    const trimmed = (typeof rawInput === 'string' ? rawInput : searchTerm || '').trim();
    if (!trimmed) return;
    if (highlightedIndex >= 0 && searchResults[highlightedIndex]) {
      const p = searchResults[highlightedIndex];
      setSelectedForCart(p);
      setSelectedQtyInput('1');
      setSearchResults([]);
      setHighlightedIndex(-1);
      setSearchTerm('');
      setTimeout(() => selectedQtyRef.current?.focus(), 50);
      return;
    }
    try {
      const response = await productService.parseBarcode(trimmed);
      const { product, weight } = response.data;
      if (!product) throw new Error('No product');
      let qty = 1;
      if (weight != null && Number(weight) > 0) {
        const w = Number(weight);
        const unit = (product.unit || '').toLowerCase();
        qty = (unit === 'kg' || unit === 'l') ? w / 1000 : w;
        qty = parseFloat(Number(qty).toFixed(6));
      }
      addLineToCart(product, qty);
      setSearchTerm('');
      setSearchResults([]);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    } catch {
      if (searchResults.length === 1) {
        setSelectedForCart(searchResults[0]);
        setSelectedQtyInput('1');
        setSearchResults([]);
        setHighlightedIndex(-1);
        setSearchTerm('');
        setTimeout(() => selectedQtyRef.current?.focus(), 50);
      } else if (searchResults.length > 1) {
        searchInputRef.current?.focus();
      } else {
        alert('Product not found. Scan barcode or type name to search.');
      }
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    runSearchSubmit();
  };

  const updateItemQty = (productId, delta) => {
    setItems(prev => prev.map(it => {
      if (it.productId !== productId) return it;
      // Small step so weight qtys like 0.125 are not jumped by whole units
      const newQty = Math.max(0.000001, parseFloat(((Number(it.quantity) || 0) + delta).toFixed(6)));
      const maxAllowed = getEditInvoiceMaxQty(products, productId, initialInvoiceQtyByProductIdRef.current);
      if (wouldExceedStockDirect(maxAllowed, newQty)) {
        insufficientRetryRef.current = { type: 'EDIT_SET_QTY', productId, newQty };
        setInsufficientStockContext({
          product: it,
          ceiling: maxAllowed,
          requestedTotalQty: newQty,
        });
        return it;
      }
      return { ...it, quantity: newQty, quantityText: formatQtyDisplay(newQty) };
    }).filter(it => (Number(it.quantity) || 0) > 0));
    setEditingQty(prev => ({ ...prev, [productId]: undefined }));
  };

  const updateItemField = (productId, field, value) => {
    setItems(prev => prev.map(it => (it.productId === productId ? { ...it, [field]: value } : it)));
  };

  const handleQtyFocus = (productId, currentQty, quantityText) => {
    setEditingQty(prev => ({
      ...prev,
      [productId]: quantityText != null && quantityText !== ''
        ? String(quantityText)
        : formatQtyDisplay(currentQty)
    }));
  };
  const handleQtyChange = (productId, value) => {
    // Allow free typing (including "0.", "0.12") — do not coerce until blur
    setEditingQty(prev => ({ ...prev, [productId]: value }));
  };
  const handleQtyBlur = (productId) => {
    const raw = editingQty[productId];
    if (raw === undefined) return;
    if (raw === '' || raw === '.') {
      setEditingQty(prev => ({ ...prev, [productId]: undefined }));
      return;
    }
    const num = parseQty(raw);
    if (!Number.isFinite(num) || num <= 0) {
      setEditingQty(prev => ({ ...prev, [productId]: undefined }));
      return;
    }
    const maxAllowed = getEditInvoiceMaxQty(products, productId, initialInvoiceQtyByProductIdRef.current);
    if (wouldExceedStockDirect(maxAllowed, num)) {
      const row = items.find((it) => it.productId === productId);
      insufficientRetryRef.current = { type: 'EDIT_SET_QTY', productId, newQty: num };
      setInsufficientStockContext({
        product: row ? { ...row, productId } : { productId, productName: '—', unit: '' },
        ceiling: maxAllowed,
        requestedTotalQty: num,
      });
      setEditingQty(prev => ({ ...prev, [productId]: undefined }));
      return;
    }
    // Keep the typed string so "0.125" is not reformatted away
    const typed = String(raw).trim().replace(',', '.');
    setItems(prev => prev.map(it => (
      it.productId === productId
        ? { ...it, quantity: num, quantityText: typed }
        : it
    )));
    setEditingQty(prev => ({ ...prev, [productId]: undefined }));
  };
  const handleQtyKeyDown = (e) => {
    if (e.key === 'Enter') e.target.blur();
  };

  const removeItem = (productId) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(it => it.productId !== productId));
  };

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
          // Send as string so backend keeps exact decimals (e.g. 0.125)
          quantity: it.quantityText != null && it.quantityText !== ''
            ? it.quantityText
            : formatQtyDisplay(it.quantity),
          unitPrice: Number(it.unitPrice) || 0
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
        <div className="billing-header-main">
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
      </div>

      <div className="billing-content">
        <div className="billing-main-content">
          <div className="cart-section">
            <p className="edit-invoice-meta">
              Date: {new Date(invoice.createdAt).toLocaleString()} · Customer: {invoice.b2bCustomer?.customerName || 'Retail'}
            </p>
            <div className="billing-search-bar cart-search-bar">
              <form onSubmit={handleSearchSubmit} className="billing-search-form">
                <Search size={20} className="billing-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="billing-search-input"
                  placeholder="Scan barcode or search product..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => (i < searchResults.length - 1 ? i + 1 : 0)); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => (i > 0 ? i - 1 : Math.max(0, searchResults.length - 1))); }
                    if (e.key === 'Enter' && searchResults[highlightedIndex]) { e.preventDefault(); runSearchSubmit(); }
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
                      onClick={() => {
                        setSelectedForCart(p);
                        setSelectedQtyInput('1');
                        setSearchResults([]);
                        setHighlightedIndex(-1);
                        setSearchTerm('');
                        setTimeout(() => selectedQtyRef.current?.focus(), 50);
                      }}
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

            {selectedForCart && (
              <div className="selected-item-temp">
                <div className="selected-item-info">
                  <span className="selected-item-name">{selectedForCart.productName}{selectedForCart.unit ? ` (${selectedForCart.unit})` : ''}</span>
                  <span className="selected-item-price">₹{selectedForCart.sellingPricePerUnit ?? selectedForCart.unitPrice}</span>
                </div>
                <div className="selected-item-actions">
                  <label className="selected-item-qty-label">Qty</label>
                  <input
                    ref={selectedQtyRef}
                    type="text"
                    inputMode="decimal"
                    className="selected-item-qty-input"
                    value={selectedQtyInput}
                    onChange={(e) => setSelectedQtyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tryAddSelectedToCart(); } }}
                  />
                  <button type="button" className="add-to-cart-btn" onClick={tryAddSelectedToCart}>Add to cart</button>
                  <button type="button" className="clear-selected-btn" onClick={() => { setSelectedForCart(null); setSelectedQtyInput('1'); searchInputRef.current?.focus(); }} aria-label="Clear"><X size={16} /></button>
                </div>
              </div>
            )}

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
                  {items.map((it) => (
                    <tr key={it.productId}>
                      <td>{it.productName}{it.unit ? ` (${it.unit})` : ''}</td>
                      <td>{it.unit || '-'}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="edit-invoice-input edit-rate"
                          value={it.unitPrice}
                          onChange={(e) => updateItemField(it.productId, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td>
                        <div className="quantity-control">
                          <button type="button" onClick={() => updateItemQty(it.productId, -0.001)} aria-label="Decrease"><Minus size={14}/></button>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="quantity-input"
                            value={editingQty[it.productId] ?? (it.quantityText ?? formatQtyDisplay(it.quantity))}
                            onChange={(e) => handleQtyChange(it.productId, e.target.value)}
                            onFocus={() => handleQtyFocus(it.productId, it.quantity, it.quantityText)}
                            onBlur={() => handleQtyBlur(it.productId)}
                            onKeyDown={handleQtyKeyDown}
                          />
                          <button type="button" onClick={() => updateItemQty(it.productId, 0.001)} aria-label="Increase"><Plus size={14}/></button>
                        </div>
                      </td>
                      <td>₹{((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)).toFixed(2)}</td>
                      <td>
                        <button type="button" className="remove-btn" onClick={() => removeItem(it.productId)} disabled={items.length <= 1}><X size={16}/></button>
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
              <div className="discount-section" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Discount</h3>
                <div className="discount-toggle">
                  <button type="button" className={`discount-toggle-btn ${discountType === 'percent' ? 'active' : ''}`} onClick={() => setDiscountType('percent')}>%</button>
                  <button type="button" className={`discount-toggle-btn ${discountType === 'amount' ? 'active' : ''}`} onClick={() => setDiscountType('amount')}>₹</button>
                </div>
                {discountType === 'percent' && (
                  <div className="discount-input-row">
                    <input
                      type="number"
                      min="0"
                      max={DISCOUNT_PERCENT_MAX}
                      step="0.5"
                      value={discountPercent || ''}
                      onChange={(e) => setDiscountPercent(Math.min(DISCOUNT_PERCENT_MAX, parseFloat(e.target.value) || 0))}
                      placeholder="0"
                    />
                    <span>%</span>
                  </div>
                )}
                {discountType === 'amount' && (
                  <div className="discount-input-row">
                    <span>₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
              {discount > 0 && (
                <div className="totals-row totals-discount">
                  <span>Discount applied</span>
                  <span>- ₹{discount.toFixed(2)}</span>
                </div>
              )}
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

      <InsufficientStockModal
        open={Boolean(insufficientStockContext)}
        productId={insufficientStockContext?.product?.productId}
        productName={insufficientStockContext?.product?.productName}
        unit={insufficientStockContext?.product?.unit}
        currentStock={insufficientStockContext?.ceiling}
        requestedTotalQty={insufficientStockContext?.requestedTotalQty}
        qtyDecimals={3}
        onClose={() => {
          insufficientRetryRef.current = null;
          setInsufficientStockContext(null);
        }}
        onStockAdded={handleInsufficientStockResolved}
      />
    </div>
  );
};

export default EditInvoicePage;
