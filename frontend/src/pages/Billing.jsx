import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService, invoiceService, authService } from '../services/api';
import './Billing.css';
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Printer, 
  CreditCard, 
  Banknote, 
  QrCode,
  ArrowLeft,
  X,
  Phone
} from 'lucide-react';

const DISCOUNT_PERCENT_MAX = 30;
const BILLING_CART_KEY = 'spice_billing_cart';

const loadCartFromStorage = () => {
  try {
    const saved = localStorage.getItem(BILLING_CART_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    return [];
  }
  return [];
};

const Billing = () => {
  const [cart, setCart] = useState(loadCartFromStorage);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amounts, setAmounts] = useState({ cash: 0, card: 0, upi: 0 });
  const [discountType, setDiscountType] = useState('percent'); // 'percent' | 'amount'
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDraft, setPreviewDraft] = useState(null); // draft with invoice number before save
  const [lastInvoice, setLastInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingQty, setEditingQty] = useState({});
  const [selectedForCart, setSelectedForCart] = useState(null); // product selected from search, pending qty + add
  const [selectedQtyInput, setSelectedQtyInput] = useState('1'); // string so user can type 0.25, 0, etc.
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const selectedQtyRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(BILLING_CART_KEY, JSON.stringify(cart));
    } else {
      localStorage.removeItem(BILLING_CART_KEY);
    }
  }, [cart]);

  const handleSearchChange = async (val) => {
    const trimmed = (val || '').trim();
    setSearchTerm(val);
    if (trimmed.length > 2) {
      try {
        const response = await productService.getAll();
        const filtered = response.data.filter(p =>
          (p.productName || '').toLowerCase().includes(trimmed.toLowerCase()) ||
          (p.barcode || '').toLowerCase().includes(trimmed.toLowerCase())
        );
        setSearchResults(filtered);
        setHighlightedIndex(filtered.length > 0 ? 0 : -1);
      } catch {
        setSearchResults([]);
        setHighlightedIndex(-1);
      }
    } else {
      setSearchResults([]);
      setHighlightedIndex(-1);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => (i < searchResults.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => (i > 0 ? i - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && searchResults[highlightedIndex]) {
      e.preventDefault();
      const p = searchResults[highlightedIndex];
      setSelectedForCart(p);
      setSelectedQtyInput('1');
      setSearchResults([]);
      setHighlightedIndex(-1);
      setSearchTerm('');
      setTimeout(() => selectedQtyRef.current?.focus(), 50);
    } else if (e.key === 'Escape') {
      setSearchResults([]);
      setHighlightedIndex(-1);
      searchInputRef.current?.blur();
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    const trimmed = (searchTerm || '').trim();
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
      if (!product) {
        throw new Error('No product');
      }
      // Weight from barcode is in grams (e.g. 250 = 250 gm). Convert to product unit for quantity.
      let qty = 1;
      if (weight != null && Number(weight) > 0) {
        const w = Number(weight);
        const unit = (product.unit || '').toLowerCase();
        qty = unit === 'kg' ? w / 1000 : w;
        qty = parseFloat(Number(qty).toFixed(3));
      }
      addToCart(product, qty);
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

  const tryAddSelectedToCart = () => {
    if (!selectedForCart) return;
    const trimmed = (selectedQtyInput || '').trim();
    if (trimmed === '') {
      alert('Please enter a quantity.');
      return;
    }
    const num = parseFloat(trimmed);
    if (isNaN(num)) {
      alert('Please enter a valid number.');
      return;
    }
    if (num <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }
    addToCart(selectedForCart, num);
    setSelectedForCart(null);
    setSelectedQtyInput('1');
    searchInputRef.current?.focus();
  };

  const addToCart = (product, initialQty = 1) => {
    const qty = typeof initialQty === 'number' && initialQty > 0 ? initialQty : 1;
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.productId);
      if (existing) {
        return prev.map(item =>
          item.productId === product.productId
            ? { ...item, quantity: parseFloat(Number(item.quantity + qty).toFixed(2)) }
            : item
        );
      }
      return [...prev, { ...product, unitPrice: product.sellingPricePerUnit, quantity: parseFloat(Number(qty).toFixed(2)) }];
    });
    setSearchResults([]);
    setSearchTerm('');
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0.1, item.quantity + delta);
        return { ...item, quantity: parseFloat(newQty.toFixed(2)) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const setQuantityDirect = (productId, value) => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const qty = num <= 0 ? 0 : parseFloat(Number(num).toFixed(3));
      return { ...item, quantity: qty };
    }).filter(item => item.quantity > 0));
    setEditingQty(prev => ({ ...prev, [productId]: undefined }));
  };

  const handleQtyFocus = (productId, currentQty) => {
    setEditingQty(prev => ({ ...prev, [productId]: String(currentQty) }));
  };
  const handleQtyChange = (productId, value) => {
    if (value === '') {
      setEditingQty(prev => ({ ...prev, [productId]: '' }));
      return;
    }
    setEditingQty(prev => ({ ...prev, [productId]: value }));
  };
  const handleQtyBlur = (productId) => {
    const raw = editingQty[productId];
    if (raw === undefined) return;
    if (raw === '' || raw === '.') {
      setEditingQty(prev => ({ ...prev, [productId]: undefined }));
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num) || num < 0) {
      setEditingQty(prev => ({ ...prev, [productId]: undefined }));
      return;
    }
    if (num === 0) {
      alert('Quantity must be greater than 0. Item removed from cart.');
      removeFromCart(productId);
      setEditingQty(prev => ({ ...prev, [productId]: undefined }));
      return;
    }
    setQuantityDirect(productId, num);
  };
  const handleQtyKeyDown = (productId, e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  const calculateCartGst = () => {
    let cgst = 0;
    let sgst = 0;
    cart.forEach(item => {
      const itemTotal = item.unitPrice * item.quantity;
      // GST % from category table only (no product-level GST column)
      const gstPct = Number(item.category?.gstPercentage) || 0;
      if (gstPct > 0) {
        const gstAmount = itemTotal - itemTotal / (1 + gstPct / 100);
        const half = gstAmount / 2;
        cgst += half;
        sgst += half;
      }
    });
    return { cgst, sgst };
  };

  const getDiscountValue = () => {
    const sub = calculateSubtotal();
    if (discountType === 'percent') {
      const pct = Math.min(Number(discountPercent) || 0, DISCOUNT_PERCENT_MAX);
      return (sub * pct) / 100;
    }
    if (discountType === 'amount') return Math.min(Number(discountAmount) || 0, sub);
    return 0;
  };

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    return Math.max(0, sub - getDiscountValue());
  };

  const formatInvoiceDateTime = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return String(value);
    }
  };

  const buildInvoicePrintHtml = (invoice, options = {}) => {
    if (!invoice) return '';
    const { twoCopies = false } = options;
    const companyName = invoice.cashier?.companyName || 'Our Spices Shop';
    const address = invoice.cashier?.address || '';
    const gstNumber = invoice.cashier?.gstNumber || '';
    const phoneNumber = invoice.cashier?.phoneNumber || '';
    const createdAt = formatInvoiceDateTime(invoice.createdAt);
    const discountAmt = Number(invoice.discountAmount) || 0;
    const totalAmount = (invoice.totalAmount ?? invoice.grandTotal ?? 0).toFixed(2);
    const payment = invoice.paymentMethod || 'CASH';
    // Retail: backend stores subtotal = taxable base. Base Amount = subtotal; Subtotal = base + CGST + SGST.
    const baseAmount = Math.max(0, Number(invoice.subtotal) || 0);
    const cgstAmt = Number(invoice.cgstAmount) || 0;
    const sgstAmt = Number(invoice.sgstAmount) || 0;
    const subtotalVal = baseAmount + cgstAmt + sgstAmt;
    const discountRow = discountAmt > 0
      ? `<div class="btoc-totals-row btoc-discount"><span>Discount</span><span>- ₹${discountAmt.toFixed(2)}</span></div>`
      : '';
    const cgstRow = cgstAmt > 0 ? `<div class="btoc-totals-row"><span>CGST</span><span>₹${cgstAmt.toFixed(2)}</span></div>` : '';
    const sgstRow = sgstAmt > 0 ? `<div class="btoc-totals-row"><span>SGST</span><span>₹${sgstAmt.toFixed(2)}</span></div>` : '';

    const itemsHtml = (invoice.items || [])
      .map((item) => {
        const name = item.productName || '';
        const qty = item.quantity ?? 0;
        const unit = item.unit || item.product?.unit || '';
        const qtyDisplay = unit ? `${qty} ${unit}` : String(qty);
        const total = item.totalPrice ?? qty * (item.unitPrice ?? item.sellingPricePerUnit ?? 0);
        return `
          <tr>
            <td class="btoc-col-item">${name}</td>
            <td class="btoc-col-qty">${qtyDisplay}</td>
            <td class="btoc-col-total">₹${Number(total).toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    const buildOneCopy = (copyHeading) => `
      <div class="btoc-print-copy">
        <div class="btoc-company">
          <div class="btoc-company-name">${companyName}</div>
          ${address ? `<div class="btoc-company-line">${address.replace(/</g, '&lt;')}</div>` : ''}
          ${phoneNumber ? `<div class="btoc-company-line">Ph. no.: ${phoneNumber.replace(/</g, '&lt;')}</div>` : ''}
          ${gstNumber ? `<div class="btoc-company-line">GST: ${gstNumber.replace(/</g, '&lt;')}</div>` : ''}
        </div>
        ${copyHeading ? `<div class="btoc-print-heading">${copyHeading}</div>` : ''}
        <div class="btoc-divider-dashed"></div>
        <div class="btoc-meta">
          <div class="btoc-meta-row"><span>Invoice #:</span><span>${invoice.invoiceNumber || ''}</span></div>
          <div class="btoc-meta-row"><span>Date:</span><span>${createdAt}</span></div>
        </div>
        <div class="btoc-divider-dashed"></div>
        <table class="btoc-items">
          <thead><tr><th class="btoc-col-item">Item</th><th class="btoc-col-qty">Qty</th><th class="btoc-col-total">Total</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="btoc-divider-dashed"></div>
        <div class="btoc-totals">
          <div class="btoc-totals-row"><span>Base Amount</span><span>₹${baseAmount.toFixed(2)}</span></div>
          ${cgstRow}
          ${sgstRow}
          <div class="btoc-totals-row"><span>Subtotal</span><span>₹${subtotalVal.toFixed(2)}</span></div>
          ${discountRow}
          <div class="btoc-totals-row btoc-total-amount"><span>Total Amount</span><span>₹${totalAmount}</span></div>
        </div>
        <div class="btoc-divider-solid"></div>
        <div class="btoc-divider-dashed"></div>
        <div class="btoc-payment">
          <div class="btoc-totals-row"><span>Payment Method</span><span>${payment}</span></div>
          <div class="btoc-totals-row"><span>Amount Paid</span><span>₹${totalAmount}</span></div>
        </div>
        <div class="btoc-footer">
          <div>Thank you for your business!</div>
          <div>Visit us again</div>
        </div>
      </div>
    `;

    const copiesHtml = twoCopies
      ? buildOneCopy() + '<div class="btoc-copy-sep"></div>' + buildOneCopy('Gate Pass')
      : buildOneCopy();
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice ${invoice.invoiceNumber || ''}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; padding: 16px; color: #111; }
            .btoc-print-copy { margin-bottom: 24px; }
            .btoc-copy-sep { break-after: page; margin-bottom: 24px; }
            .btoc-print-heading { text-align: center; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 8px 0 4px; }
            .btoc-company { text-align: center; margin-bottom: 8px; }
            .btoc-company-name { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 4px; }
            .btoc-company-line { font-size: 11px; color: #374151; margin: 2px 0; }
            .btoc-divider-dashed { border: none; border-top: 1px dashed #9ca3af; margin: 8px 0; }
            .btoc-divider-solid { border: none; border-top: 1px solid #374151; margin: 4px 0; }
            .btoc-meta { font-size: 11px; margin: 4px 0; }
            .btoc-meta-row { display: flex; justify-content: space-between; padding: 2px 0; }
            table.btoc-items { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
            table.btoc-items th, table.btoc-items td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
            table.btoc-items th { font-weight: 600; }
            .btoc-col-item { text-align: left; }
            .btoc-col-qty { text-align: center; width: 22%; }
            .btoc-col-total { text-align: right; width: 28%; }
            .btoc-totals { font-size: 12px; margin-top: 4px; }
            .btoc-totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
            .btoc-totals-row.btoc-total-amount { font-weight: 700; font-size: 14px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #111; }
            .btoc-discount { color: #059669; }
            .btoc-payment { margin-top: 8px; font-size: 11px; }
            .btoc-footer { margin-top: 14px; text-align: center; font-size: 12px; color: #4b5563; }
            .btoc-footer div { margin: 2px 0; }
          </style>
        </head>
        <body>${copiesHtml}</body>
      </html>
    `;
  };

  const printHtmlViaIframe = (html) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!win || !doc) {
      document.body.removeChild(iframe);
      return;
    }
    win.onafterprint = () => {
      try { document.body.removeChild(iframe); } catch { /* ignore */ }
    };
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try { win.print(); } catch { try { window.print(); } catch { /* ignore */ } }
    }, 250);
  };

  const handlePrintInvoice = async (invoice) => {
    if (!invoice) return;
    let toPrint = invoice;
    if (!invoice.cashier?.address || !invoice.cashier?.gstNumber) {
      try {
        const companyRes = await authService.getCompanyDetails();
        const company = companyRes?.data || {};
        toPrint = {
          ...invoice,
          cashier: {
            ...invoice.cashier,
            companyName: invoice.cashier?.companyName || company.companyName || 'Our Spices Shop',
            address: invoice.cashier?.address || company.address || '',
            gstNumber: invoice.cashier?.gstNumber || company.gstNumber || '',
            phoneNumber: invoice.cashier?.phoneNumber ?? company.phoneNumber ?? '',
            fssaiLicense: invoice.cashier?.fssaiLicense ?? company.fssaiLicense ?? ''
          }
        };
      } catch { /* ignore */ }
    }
    const html = buildInvoicePrintHtml(toPrint, { twoCopies: true });
    if (!html) return;
    printHtmlViaIframe(html);
  };

  const handlePreview = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const [numRes, companyRes] = await Promise.all([
        invoiceService.getNextInvoiceNumber('RETAIL'),
        authService.getCompanyDetails().catch(() => ({ data: null }))
      ]);
      const invoiceNumber = numRes.data?.invoiceNumber || '';
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      const company = companyRes?.data || {};
      const itemsTotal = calculateSubtotal();
      const { cgst, sgst } = calculateCartGst();
      const discountVal = getDiscountValue();
      const total = calculateTotal();
      // Draft subtotal = taxable base (same as backend), so preview/print logic matches
      const taxableBase = Math.max(0, itemsTotal - cgst - sgst);
      const draft = {
        invoiceNumber,
        createdAt: new Date().toISOString(),
        invoiceType: 'RETAIL',
        paymentMethod: paymentMethod,
        cashier: {
          companyName: company.companyName || user?.companyName || 'Our Spices Shop',
          address: company.address || '',
          gstNumber: company.gstNumber || '',
          phoneNumber: company.phoneNumber || '',
          fssaiLicense: company.fssaiLicense || ''
        },
        items: cart.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: parseFloat((item.unitPrice * item.quantity).toFixed(2))
        })),
        subtotal: parseFloat(taxableBase.toFixed(2)),
        cgstAmount: parseFloat(cgst.toFixed(2)),
        sgstAmount: parseFloat(sgst.toFixed(2)),
        discountAmount: parseFloat(discountVal.toFixed(2)),
        totalAmount: parseFloat(total.toFixed(2))
      };
      setPreviewDraft(draft);
      setShowPreview(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to get invoice number');
    } finally {
      setLoading(false);
    }
  };

  const saveInvoice = async (andPrint = false) => {
    if (!previewDraft || cart.length === 0) return;
    const total = calculateTotal();
    setLoading(true);
    try {
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      const cashierUserId = user?.userId ?? user?.id;
      const invoiceData = {
        invoiceType: 'RETAIL',
        invoiceNumber: previewDraft.invoiceNumber,
        paymentMethod: paymentMethod,
        cashAmount: paymentMethod === 'MIXED' ? Number(amounts.cash) || 0 : (paymentMethod === 'CASH' ? total : 0),
        cardAmount: paymentMethod === 'MIXED' ? Number(amounts.card) || 0 : (paymentMethod === 'CARD' ? total : 0),
        upiAmount: paymentMethod === 'MIXED' ? Number(amounts.upi) || 0 : (paymentMethod === 'UPI' ? total : 0),
        discountAmount: getDiscountValue(),
        ...(cashierUserId != null && { cashier: { userId: cashierUserId } }),
        items: cart.map(item => ({
          product: { productId: item.productId },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: 0
        }))
      };
      const response = await invoiceService.create(invoiceData);
      setLastInvoice(response.data);
      setPreviewDraft(null);
      setCart([]);
      setShowPreview(true);
      if (andPrint) handlePrintInvoice(response.data);
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOnly = () => saveInvoice(false);
  const handleSaveAndPrint = () => saveInvoice(true);

  const cartGst = calculateCartGst();

  return (
    <div className="billing-container">
      <div className="billing-header">
        <div className="billing-header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1>🧾 Create Invoice</h1>
          <button className="nav-link-button" onClick={() => navigate('/dashboard/bills')}>
            📚 Bills
          </button>
        </div>
      </div>

      <div className="billing-content">
        <div className="billing-main-content">
          <div className="cart-section">
          <div className="billing-search-bar cart-search-bar">
            <form onSubmit={handleSearchSubmit} className="billing-search-form">
              <Search size={20} className="billing-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="billing-search-input"
                placeholder="Scan barcode or search by product name..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                autoComplete="off"
              />
            </form>
            {searchResults.length > 0 && (
              <div className="product-search-dropdown">
                {searchResults.map((p, idx) => (
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      tryAddSelectedToCart();
                    }
                  }}
                />
                <button
                  type="button"
                  className="add-to-cart-btn"
                  onClick={tryAddSelectedToCart}
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  className="clear-selected-btn"
                  onClick={() => { setSelectedForCart(null); setSelectedQtyInput('1'); searchInputRef.current?.focus(); }}
                  aria-label="Clear"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="section-header">
            <ShoppingCart size={20} />
            <h2>Current Cart ({cart.length} items)</h2>
          </div>
          <div className="cart-table-wrapper">
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr><td colSpan="6" className="empty-cart">Cart is empty. Scan or search for products.</td></tr>
                ) : cart.map(item => (
                  <tr key={item.productId}>
                    <td>{item.productName}</td>
                    <td>{item.unit || '-'}</td>
                    <td>₹{item.unitPrice}</td>
                    <td>
                      <div className="quantity-control">
                        <button type="button" onClick={() => updateQuantity(item.productId, -1)} aria-label="Decrease"><Minus size={14}/></button>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="quantity-input"
                          value={editingQty[item.productId] ?? item.quantity}
                          onChange={(e) => handleQtyChange(item.productId, e.target.value)}
                          onFocus={() => handleQtyFocus(item.productId, item.quantity)}
                          onBlur={() => handleQtyBlur(item.productId)}
                          onKeyDown={(e) => handleQtyKeyDown(item.productId, e)}
                        />
                        <button type="button" onClick={() => updateQuantity(item.productId, 1)} aria-label="Increase"><Plus size={14}/></button>
                      </div>
                    </td>
                    <td>₹{(item.unitPrice * item.quantity).toFixed(2)}</td>
                    <td>
                      <button className="remove-btn" onClick={() => removeFromCart(item.productId)}>
                        <X size={16} />
                      </button>
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
              <span>Base Amount</span>
              <span>₹{(Math.max(0, calculateSubtotal() - cartGst.cgst - cartGst.sgst)).toFixed(2)}</span>
            </div>
            {cartGst.cgst > 0 && (
              <div className="totals-row">
                <span>CGST</span>
                <span>₹{cartGst.cgst.toFixed(2)}</span>
              </div>
            )}
            {cartGst.sgst > 0 && (
              <div className="totals-row">
                <span>SGST</span>
                <span>₹{cartGst.sgst.toFixed(2)}</span>
              </div>
            )}
            <div className="totals-row">
              <span>Subtotal</span>
              <span>₹{calculateSubtotal().toFixed(2)}</span>
            </div>
            {getDiscountValue() > 0 && (
              <div className="totals-row totals-discount">
                <span>Discount{discountType === 'percent' ? ` (${Math.min(Number(discountPercent) || 0, DISCOUNT_PERCENT_MAX)}%)` : ''}</span>
                <span>- ₹{getDiscountValue().toFixed(2)}</span>
              </div>
            )}
            <div className="totals-row total-amount">
              <span>Total Amount</span>
              <span>₹{calculateTotal().toFixed(2)}</span>
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
                  <div className="mixed-row">
                    <label>Cash ₹</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amounts.cash || ''}
                      onChange={(e) => setAmounts(a => ({ ...a, cash: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="mixed-row">
                    <label>Card ₹</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amounts.card || ''}
                      onChange={(e) => setAmounts(a => ({ ...a, card: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="mixed-row">
                    <label>UPI ₹</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amounts.upi || ''}
                      onChange={(e) => setAmounts(a => ({ ...a, upi: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="discount-section">
              <h3>Discount</h3>
              <div className="discount-toggle">
                <button
                  type="button"
                  className={`discount-toggle-btn ${discountType === 'percent' ? 'active' : ''}`}
                  onClick={() => setDiscountType('percent')}
                >
                  %
                </button>
                <button
                  type="button"
                  className={`discount-toggle-btn ${discountType === 'amount' ? 'active' : ''}`}
                  onClick={() => setDiscountType('amount')}
                >
                  ₹
                </button>
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
                    placeholder="0–30"
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

            <button 
              className="submit-btn checkout-btn" 
              disabled={cart.length === 0 || loading}
              onClick={handlePreview}
            >
              {loading ? 'Loading...' : 'Preview Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {showPreview && (previewDraft || lastInvoice) && (() => {
        const display = previewDraft ?? lastInvoice;
        const isDraft = !!previewDraft;
        // display.subtotal from backend/draft is taxable base (base amount)
        const baseAmount = Math.max(0, Number(display.subtotal) || 0);
        const cgstAmt = Number(display.cgstAmount) || 0;
        const sgstAmt = Number(display.sgstAmount) || 0;
        const subtotalVal = baseAmount + cgstAmt + sgstAmt;
        const discountAmt = Number(display.discountAmount) || 0;
        const totalAmt = Number(display.totalAmount) || 0;
        return (
        <div className="bill-preview-overlay">
          <div className="bill-preview-container btoc-preview-container">
            <div className="bill-preview-header btoc-preview-header">
              <h2 className="btoc-preview-title">Bill Preview</h2>
              <div className="btoc-preview-header-btns">
                {!isDraft && (
                  <button type="button" className="btoc-btn-print" onClick={() => handlePrintInvoice(lastInvoice)}>
                    <Printer size={18} /> Print Bill
                  </button>
                )}
                <button type="button" className="btoc-btn-close" onClick={() => { setPreviewDraft(null); setShowPreview(false); }}>X Close</button>
              </div>
            </div>
            <div className="bill-preview-content btoc-preview-content" id="printable-bill">
              <div className="btoc-company">
                <div className="btoc-company-name">{display.cashier?.companyName || 'Our Spices Shop'}</div>
                {display.cashier?.address && <div className="btoc-company-line">{display.cashier.address}</div>}
                {display.cashier?.phoneNumber && (
                  <div className="btoc-company-line btoc-company-phone">
                    <Phone size={14} className="btoc-phone-icon" /> {display.cashier.phoneNumber}
                  </div>
                )}
                {display.cashier?.gstNumber && <div className="btoc-company-line">GST: {display.cashier.gstNumber}</div>}
              </div>
              <div className="btoc-divider-dashed" />
              <div className="btoc-meta">
                <div className="btoc-meta-row">
                  <span>Invoice #:</span>
                  <span>{display.invoiceNumber}</span>
                </div>
                <div className="btoc-meta-row">
                  <span>Date:</span>
                  <span>{new Date(display.createdAt).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                </div>
              </div>
              <div className="btoc-divider-dashed" />
              <table className="btoc-items-table">
                <thead>
                  <tr>
                    <th className="btoc-col-item">Item</th>
                    <th className="btoc-col-qty">Qty</th>
                    <th className="btoc-col-total">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(display.items || []).map((item, idx) => {
                    const qty = item.quantity ?? 0;
                    const unit = item.unit || '';
                    const qtyDisplay = unit ? `${qty} ${unit}` : String(qty);
                    const total = item.totalPrice ?? qty * (item.unitPrice ?? 0);
                    return (
                      <tr key={item.itemId ?? idx}>
                        <td className="btoc-col-item">{item.productName}</td>
                        <td className="btoc-col-qty">{qtyDisplay}</td>
                        <td className="btoc-col-total">₹{Number(total).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="btoc-divider-dashed" />
              <div className="btoc-totals">
                <div className="btoc-totals-row"><span>Base Amount</span><span>₹{baseAmount.toFixed(2)}</span></div>
                {cgstAmt > 0 && <div className="btoc-totals-row"><span>CGST</span><span>₹{cgstAmt.toFixed(2)}</span></div>}
                {sgstAmt > 0 && <div className="btoc-totals-row"><span>SGST</span><span>₹{sgstAmt.toFixed(2)}</span></div>}
                <div className="btoc-totals-row"><span>Subtotal</span><span>₹{subtotalVal.toFixed(2)}</span></div>
                {discountAmt > 0 && <div className="btoc-totals-row btoc-discount"><span>Discount</span><span>- ₹{discountAmt.toFixed(2)}</span></div>}
                <div className="btoc-divider-solid" />
                <div className="btoc-totals-row btoc-total-amount"><span>Total Amount</span><span>₹{totalAmt.toFixed(2)}</span></div>
              </div>
              <div className="btoc-divider-dashed" />
              <div className="btoc-payment">
                <div className="btoc-totals-row"><span>Payment Method</span><span>{display.paymentMethod || 'CASH'}</span></div>
                <div className="btoc-totals-row"><span>Amount Paid</span><span>₹{totalAmt.toFixed(2)}</span></div>
              </div>
              <div className="btoc-footer">
                <div>Thank you for your business!</div>
                <div>Visit us again</div>
              </div>
            </div>
            <div className="bill-preview-actions">
              {isDraft ? (
                <>
                  <button className="print-btn" onClick={handleSaveOnly} disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button className="print-btn" onClick={handleSaveAndPrint} disabled={loading}>
                    {loading ? 'Saving...' : 'Save & Print'}
                  </button>
                  <button className="secondary-btn" onClick={() => { setPreviewDraft(null); setShowPreview(false); }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="print-btn" onClick={() => handlePrintInvoice(lastInvoice)}>
                    <Printer size={18} /> Print Bill
                  </button>
                  <button className="secondary-btn" onClick={() => setShowPreview(false)}>
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ); })()}
    </div>
  );
};

export default Billing;
