import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService, invoiceService, authService, b2bCustomerService } from '../services/api';
import { buildInvoicePrintHtml, printHtmlViaIframe } from '../utils/invoicePrint';
import './Billing.css';
import { Search, Plus, Minus, ShoppingCart, Printer, ArrowLeft, X, UserPlus } from 'lucide-react';

const DISCOUNT_PERCENT_MAX = 30;

const B2BBilling = () => {
  const [b2bCustomers, setB2bCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amounts, setAmounts] = useState({ cash: 0, card: 0, upi: 0 });
  const [discountType, setDiscountType] = useState('percent');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDraft, setPreviewDraft] = useState(null);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingQty, setEditingQty] = useState({});
  const [selectedForCart, setSelectedForCart] = useState(null);
  const [selectedQtyInput, setSelectedQtyInput] = useState('1');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customerName: '',
    gstNumber: '',
    billingAddress: '',
    shippingAddress: '',
    address: '',
    phone: '',
    email: ''
  });
  const [ewayBillNumber, setEwayBillNumber] = useState('');
  const [nextBillNumber, setNextBillNumber] = useState('');
  const searchInputRef = useRef(null);
  const selectedQtyRef = useRef(null);
  const navigate = useNavigate();

  const fetchNextBillNumber = async () => {
    try {
      const res = await invoiceService.getNextB2BInvoiceNumber();
      setNextBillNumber((res.data?.invoiceNumber || '').toString().trim());
    } catch {
      setNextBillNumber('');
    }
  };

  const fetchB2bCustomers = async () => {
    try {
      const res = await b2bCustomerService.getAll();
      setB2bCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch B2B customers', err);
      setB2bCustomers([]);
    }
  };

  useEffect(() => {
    fetchB2bCustomers();
    fetchNextBillNumber();
  }, []);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const filteredCustomers = b2bCustomers.filter(c =>
    (c.customerName || '').toLowerCase().includes((customerSearch || '').toLowerCase()) ||
    (c.gstNumber || '').toLowerCase().includes((customerSearch || '').toLowerCase())
  );

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
      if (!product) throw new Error('No product');
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
    if (isNaN(num) || num <= 0) {
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
    const gstPct = Number(product.category?.gstPercentage) ?? 0;
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.productId);
      if (existing) {
        return prev.map(item =>
          item.productId === product.productId
            ? { ...item, quantity: parseFloat(Number(item.quantity + qty).toFixed(2)) }
            : item
        );
      }
      return [...prev, {
        ...product,
        unitPrice: product.sellingPricePerUnit ?? product.unitPrice,
        quantity: parseFloat(Number(qty).toFixed(2)),
        hsnCode: product.hsnCode || '',
        gstPercentage: gstPct
      }];
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
    if (e.key === 'Enter') e.target.blur();
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateCartItemHsn = (productId, value) => {
    setCart(prev => prev.map(item => item.productId === productId ? { ...item, hsnCode: value } : item));
  };
  const updateCartItemPrice = (productId, value) => {
    if (value === '') return;
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setCart(prev => prev.map(item => item.productId === productId ? { ...item, unitPrice: num } : item));
  };
  const updateCartItemGst = (productId, value) => {
    if (value === '') return;
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setCart(prev => prev.map(item => item.productId === productId ? { ...item, gstPercentage: num } : item));
  };

  // B2B: taxable base = sum(price * qty), single GST = sum(price * qty * gst%/100)
  const calculateSubtotalB2B = () => cart.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0), 0);
  const calculateCartGstB2B = () => cart.reduce((sum, item) => {
    const taxable = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
    const gstPct = Number(item.gstPercentage) ?? 0;
    return sum + taxable * (gstPct / 100);
  }, 0);
  const getDiscountValue = () => {
    const sub = calculateSubtotalB2B();
    if (discountType === 'percent') {
      const pct = Math.min(Number(discountPercent) || 0, DISCOUNT_PERCENT_MAX);
      return (sub * pct) / 100;
    }
    if (discountType === 'amount') return Math.min(Number(discountAmount) || 0, sub);
    return 0;
  };
  const calculateTotalB2B = () => Math.max(0, calculateSubtotalB2B() + calculateCartGstB2B() - getDiscountValue());
  const getItemTotalB2B = (item) => {
    const taxable = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
    const gstPct = Number(item.gstPercentage) ?? 0;
    return taxable * (1 + gstPct / 100);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const name = (newCustomer.customerName || '').trim();
    const gst = (newCustomer.gstNumber || '').trim();
    if (!name || !gst) {
      alert('Customer name and GST number are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await b2bCustomerService.create({
        customerName: name,
        gstNumber: gst,
        billingAddress: (newCustomer.billingAddress || '').trim() || null,
        shippingAddress: (newCustomer.shippingAddress || '').trim() || null,
        address: (newCustomer.address || '').trim() || null,
        phone: (newCustomer.phone || '').trim() || null,
        email: (newCustomer.email || '').trim() || null
      });
      await fetchB2bCustomers();
      setSelectedCustomer(res.data);
      setShowAddCustomer(false);
      setNewCustomer({ customerName: '', gstNumber: '', billingAddress: '', shippingAddress: '', address: '', phone: '', email: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add customer.');
    } finally {
      setLoading(false);
    }
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
            gstNumber: invoice.cashier?.gstNumber || company.gstNumber || ''
          }
        };
      } catch {}
    }
    const html = buildInvoicePrintHtml(toPrint, { twoCopies: false });
    if (html) printHtmlViaIframe(html);
  };

  const handlePreview = async () => {
    if (!selectedCustomer) {
      alert('Please select a B2B customer.');
      return;
    }
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const [numRes, companyRes] = await Promise.all([
        invoiceService.getNextB2BInvoiceNumber(),
        authService.getCompanyDetails().catch(() => ({ data: null }))
      ]);
      const invoiceNumber = (numRes.data?.invoiceNumber || '').toString().trim();
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      const company = companyRes?.data || {};
      const subtotal = calculateSubtotalB2B();
      const gstTotal = calculateCartGstB2B();
      const discountVal = getDiscountValue();
      const total = calculateTotalB2B();
      const draft = {
        invoiceNumber,
        createdAt: new Date().toISOString(),
        invoiceType: 'B2B',
        ewayBillNumber: ewayBillNumber.trim() || null,
        paymentMethod,
        b2bCustomer: selectedCustomer,
        cashier: {
          companyName: company.companyName || user?.companyName || 'Our Spices Shop',
          address: company.address || '',
          gstNumber: company.gstNumber || ''
        },
        items: cart.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          hsnCode: item.hsnCode || '',
          gstPercentage: Number(item.gstPercentage) ?? 0,
          totalPrice: parseFloat(getItemTotalB2B(item).toFixed(2))
        })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        cgstAmount: parseFloat((gstTotal / 2).toFixed(2)),
        sgstAmount: parseFloat((gstTotal / 2).toFixed(2)),
        discountAmount: parseFloat(discountVal.toFixed(2)),
        totalAmount: parseFloat(total.toFixed(2))
      };
      setPreviewDraft(draft);
      setShowPreview(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to get invoice number');
    } finally {
      setLoading(false);
    }
  };

  const saveInvoice = async (andPrint = false) => {
    if (!previewDraft || !selectedCustomer || cart.length === 0) return;
    const total = calculateTotalB2B();
    setLoading(true);
    try {
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      const invoiceData = {
        invoiceType: 'B2B',
        b2bCustomerId: selectedCustomer.customerId,
        invoiceNumber: previewDraft.invoiceNumber,
        ...(ewayBillNumber.trim() && { ewayBillNumber: ewayBillNumber.trim() }),
        paymentMethod,
        cashAmount: paymentMethod === 'MIXED' ? Number(amounts.cash) || 0 : (paymentMethod === 'CASH' ? total : 0),
        cardAmount: paymentMethod === 'MIXED' ? Number(amounts.card) || 0 : (paymentMethod === 'CARD' ? total : 0),
        upiAmount: paymentMethod === 'MIXED' ? Number(amounts.upi) || 0 : (paymentMethod === 'UPI' ? total : 0),
        discountAmount: getDiscountValue(),
        ...(user?.userId != null && { cashier: { userId: user.userId } }),
        items: cart.map(item => ({
          product: { productId: item.productId },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          hsnCode: (item.hsnCode || '').trim() || undefined,
          gstPercentage: Number(item.gstPercentage) ?? 0,
          discountAmount: 0
        }))
      };
      const response = await invoiceService.create(invoiceData);
      setLastInvoice(response.data);
      setPreviewDraft(null);
      setCart([]);
      setEwayBillNumber('');
      setShowPreview(true);
      if (andPrint) handlePrintInvoice(response.data);
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const cartGstB2B = calculateCartGstB2B();
  const isDraft = previewDraft && !lastInvoice;

  return (
    <div className="billing-container">
      <div className="billing-header">
        <div className="billing-header-main">
          <div className="billing-header-actions">
            <button className="back-button" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={18} /> Back
            </button>
            <h1>🏢 B2B Billing</h1>
            {nextBillNumber && (
              <span className="b2b-bill-number-badge">Bill #: {nextBillNumber}</span>
            )}
          </div>
          <div className="billing-header-actions">
            <button className="nav-link-button" onClick={() => navigate('/dashboard/b2b-bills')}>
              🏢 B2B Bills
            </button>
            <button className="nav-link-button" onClick={() => navigate('/dashboard/bills')}>
              📚 All Bills
            </button>
          </div>
        </div>
      </div>

      {/* B2B Customer selection */}
      <div className="b2b-customer-section">
        <h3>B2B Customer</h3>
        <div className="b2b-customer-row">
          <input
            type="text"
            className="billing-search-input b2b-customer-search"
            placeholder="Search customer name or GST..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />
          <button type="button" className="add-customer-btn" onClick={() => setShowAddCustomer(true)}>
            <UserPlus size={18} /> Add customer
          </button>
        </div>
        {selectedCustomer && (
          <div className="b2b-selected-card">
            <strong>{selectedCustomer.customerName}</strong>
            {selectedCustomer.gstNumber && <span> GST: {selectedCustomer.gstNumber}</span>}
            {selectedCustomer.billingAddress && <p className="b2b-address"><strong>Billing:</strong> {selectedCustomer.billingAddress}</p>}
            {selectedCustomer.shippingAddress && <p className="b2b-address"><strong>Shipping:</strong> {selectedCustomer.shippingAddress}</p>}
            <button type="button" className="clear-customer-btn" onClick={() => setSelectedCustomer(null)}>Change</button>
          </div>
        )}
        {!selectedCustomer && filteredCustomers.length > 0 && (
          <ul className="b2b-customer-list">
            {filteredCustomers.slice(0, 8).map(c => (
              <li key={c.customerId}>
                <button
                  type="button"
                  className="b2b-customer-item"
                  onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }}
                >
                  {c.customerName} {c.gstNumber ? `(${c.gstNumber})` : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
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
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tryAddSelectedToCart(); } }}
                  />
                  <button type="button" className="add-to-cart-btn" onClick={tryAddSelectedToCart}>Add to cart</button>
                  <button type="button" className="clear-selected-btn" onClick={() => { setSelectedForCart(null); setSelectedQtyInput('1'); searchInputRef.current?.focus(); }} aria-label="Clear"><X size={16} /></button>
                </div>
              </div>
            )}

            <div className="section-header">
              <ShoppingCart size={20} />
              <h2>Current Cart ({cart.length} items)</h2>
            </div>
            <div className="cart-table-wrapper">
              <table className="cart-table b2b-cart-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>HSN</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>GST %</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr><td colSpan="7" className="empty-cart">Cart is empty. Search and add products.</td></tr>
                  ) : cart.map(item => (
                    <tr key={item.productId}>
                      <td>{item.productName}{item.unit ? ` (${item.unit})` : ''}</td>
                      <td>
                        <input
                          type="text"
                          className="b2b-cart-input b2b-hsn-input"
                          value={item.hsnCode ?? ''}
                          onChange={(e) => updateCartItemHsn(item.productId, e.target.value)}
                          placeholder="HSN"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="b2b-cart-input b2b-price-input"
                          value={item.unitPrice ?? ''}
                          onChange={(e) => updateCartItemPrice(item.productId, e.target.value)}
                        />
                      </td>
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
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          className="b2b-cart-input b2b-gst-input"
                          value={item.gstPercentage != null ? item.gstPercentage : ''}
                          onChange={(e) => updateCartItemGst(item.productId, e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td>₹{getItemTotalB2B(item).toFixed(2)}</td>
                      <td>
                        <button className="remove-btn" onClick={() => removeFromCart(item.productId)}><X size={16} /></button>
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
                <span>Subtotal (taxable)</span>
                <span>₹{calculateSubtotalB2B().toFixed(2)}</span>
              </div>
              {cartGstB2B > 0 && (
                <div className="totals-row">
                  <span>GST</span>
                  <span>₹{cartGstB2B.toFixed(2)}</span>
                </div>
              )}
              {getDiscountValue() > 0 && (
                <div className="totals-row totals-discount">
                  <span>Discount{discountType === 'percent' ? ` (${Math.min(Number(discountPercent) || 0, DISCOUNT_PERCENT_MAX)}%)` : ''}</span>
                  <span>- ₹{getDiscountValue().toFixed(2)}</span>
                </div>
              )}
              <div className="totals-row total-amount">
                <span>Total Amount</span>
                <span>₹{calculateTotalB2B().toFixed(2)}</span>
              </div>

              <div className="eway-bill-section">
                <label htmlFor="b2b-eway-bill">E-way Bill No.</label>
                <input
                  id="b2b-eway-bill"
                  type="text"
                  className="eway-bill-input"
                  value={ewayBillNumber}
                  onChange={(e) => setEwayBillNumber(e.target.value)}
                  placeholder="Optional – e.g. EWB123456789012"
                />
              </div>

              <div className="payment-section">
                <h3>Payment Method</h3>
                <select className="payment-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="MIXED">Mixed</option>
                </select>
                {paymentMethod === 'MIXED' && (
                  <div className="mixed-amounts">
                    <div className="mixed-row"><label>Cash ₹</label><input type="number" min="0" step="0.01" value={amounts.cash || ''} onChange={(e) => setAmounts(a => ({ ...a, cash: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))} placeholder="0" /></div>
                    <div className="mixed-row"><label>Card ₹</label><input type="number" min="0" step="0.01" value={amounts.card || ''} onChange={(e) => setAmounts(a => ({ ...a, card: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))} placeholder="0" /></div>
                    <div className="mixed-row"><label>UPI ₹</label><input type="number" min="0" step="0.01" value={amounts.upi || ''} onChange={(e) => setAmounts(a => ({ ...a, upi: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))} placeholder="0" /></div>
                  </div>
                )}
              </div>

              <div className="discount-section">
                <h3>Discount</h3>
                <div className="discount-toggle">
                  <button type="button" className={`discount-toggle-btn ${discountType === 'percent' ? 'active' : ''}`} onClick={() => setDiscountType('percent')}>%</button>
                  <button type="button" className={`discount-toggle-btn ${discountType === 'amount' ? 'active' : ''}`} onClick={() => setDiscountType('amount')}>₹</button>
                </div>
                {discountType === 'percent' && (
                  <div className="discount-input-row">
                    <input type="number" min="0" max={DISCOUNT_PERCENT_MAX} step="0.5" value={discountPercent || ''} onChange={(e) => setDiscountPercent(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} placeholder="0" />
                    <span>%</span>
                  </div>
                )}
                {discountType === 'amount' && (
                  <div className="discount-input-row">
                    <span>₹</span>
                    <input type="number" min="0" step="0.01" value={discountAmount || ''} onChange={(e) => setDiscountAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} placeholder="0" />
                  </div>
                )}
              </div>

              <button className="preview-invoice-btn" onClick={handlePreview} disabled={!selectedCustomer || cart.length === 0 || loading}>
                {loading ? 'Loading...' : 'Preview Invoice'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add B2B Customer modal */}
      {showAddCustomer && (
        <div className="modal-overlay" onClick={() => setShowAddCustomer(false)}>
          <div className="modal-content b2b-add-modal" onClick={e => e.stopPropagation()}>
            <div className="bills-detail-header">
              <h2>Add B2B Customer</h2>
              <button type="button" className="modal-close" onClick={() => setShowAddCustomer(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddCustomer} className="b2b-add-form">
              <div className="form-group">
                <label>Customer Name *</label>
                <input type="text" value={newCustomer.customerName} onChange={(e) => setNewCustomer(c => ({ ...c, customerName: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>GST Number *</label>
                <input type="text" value={newCustomer.gstNumber} onChange={(e) => setNewCustomer(c => ({ ...c, gstNumber: e.target.value }))} required placeholder="e.g. 29AAAAA0000A1Z5" />
              </div>
              <div className="form-group">
                <label>Billing Address</label>
                <textarea value={newCustomer.billingAddress} onChange={(e) => setNewCustomer(c => ({ ...c, billingAddress: e.target.value }))} rows={2} placeholder="Full billing address" />
              </div>
              <div className="form-group">
                <label>Shipping Address</label>
                <textarea value={newCustomer.shippingAddress} onChange={(e) => setNewCustomer(c => ({ ...c, shippingAddress: e.target.value }))} rows={2} placeholder="Delivery / shipping address (if different)" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={newCustomer.phone} onChange={(e) => setNewCustomer(c => ({ ...c, phone: e.target.value }))} placeholder="Phone" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer(c => ({ ...c, email: e.target.value }))} placeholder="Email" />
              </div>
              <div className="bills-detail-actions">
                <button type="submit" className="print-btn" disabled={loading}>{loading ? 'Adding...' : 'Add Customer'}</button>
                <button type="button" className="back-button" onClick={() => setShowAddCustomer(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview / success modal – A4 sheet format */}
      {showPreview && (previewDraft || lastInvoice) && (() => {
        const draft = previewDraft || lastInvoice;
        const cust = draft.b2bCustomer;
        return (
          <div className="modal-overlay b2b-preview-overlay" onClick={() => { if (!isDraft) setShowPreview(false); }}>
            <div className="bill-preview-modal b2b-bill-preview-modal" onClick={e => e.stopPropagation()}>
              <div className="bill-preview-header">
                <h2>{isDraft ? 'B2B Tax Invoice – Preview' : 'B2B Tax Invoice'}</h2>
                <button type="button" className="modal-close" onClick={() => { setPreviewDraft(null); setShowPreview(false); }}>×</button>
              </div>
              <div className="b2b-a4-wrapper">
                <div className="b2b-a4-sheet" id="b2b-print-area">
                  <div className="b2b-a4-invoice-no">Invoice No: <strong>{draft.invoiceNumber}</strong></div>
                  <div className="b2b-a4-header">
                    <div className="b2b-a4-company">
                      <p className="b2b-a4-company-name">{draft.cashier?.companyName || 'Our Spices Shop'}</p>
                      {draft.cashier?.address && <p className="b2b-a4-address">{draft.cashier.address}</p>}
                      {draft.cashier?.gstNumber && <p className="b2b-a4-gst">GST: {draft.cashier.gstNumber}</p>}
                    </div>
                    <div className="b2b-a4-title">TAX INVOICE (B2B)</div>
                  </div>
                  <div className="b2b-a4-meta">
                    <div className="b2b-a4-meta-row">
                      <span><strong>Date:</strong> {new Date(draft.createdAt).toLocaleDateString()}</span>
                      <span><strong>Invoice #:</strong> {draft.invoiceNumber}</span>
                    </div>
                    {draft.ewayBillNumber && (
                      <div className="b2b-a4-meta-row">
                        <span><strong>E-way Bill No:</strong> {draft.ewayBillNumber}</span>
                      </div>
                    )}
                  </div>
                  <div className="b2b-a4-parties">
                    <div className="b2b-a4-party">
                      <strong>Bill To</strong>
                      <p>{cust?.customerName || 'Customer'}</p>
                      {cust?.gstNumber && <p>GST: {cust.gstNumber}</p>}
                      {cust?.billingAddress && <p className="b2b-a4-address-block">{cust.billingAddress}</p>}
                    </div>
                    {cust?.shippingAddress && (
                      <div className="b2b-a4-party">
                        <strong>Ship To</strong>
                        <p className="b2b-a4-address-block">{cust.shippingAddress}</p>
                      </div>
                    )}
                  </div>
                  <table className="b2b-a4-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th>HSN</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>GST %</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(draft.items || []).map((it, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{it.productName}{it.unit ? ` (${it.unit})` : ''}</td>
                          <td>{it.hsnCode || '–'}</td>
                          <td>{Number(it.quantity)}</td>
                          <td>₹{Number(it.unitPrice).toFixed(2)}</td>
                          <td>{Number(it.gstPercentage) ?? 0}%</td>
                          <td>₹{Number(it.totalPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="b2b-a4-totals">
                    <div className="b2b-a4-totals-row"><span>Subtotal (taxable)</span><span>₹{(Number(draft.subtotal) || 0).toFixed(2)}</span></div>
                    {((Number(draft.cgstAmount) || 0) + (Number(draft.sgstAmount) || 0)) > 0 && (
                      <div className="b2b-a4-totals-row"><span>GST</span><span>₹{((Number(draft.cgstAmount) || 0) + (Number(draft.sgstAmount) || 0)).toFixed(2)}</span></div>
                    )}
                    {(Number(draft.discountAmount) || 0) > 0 && (
                      <div className="b2b-a4-totals-row"><span>Discount</span><span>- ₹{(Number(draft.discountAmount) || 0).toFixed(2)}</span></div>
                    )}
                    <div className="b2b-a4-totals-row b2b-a4-total"><span>Total</span><span>₹{(Number(draft.totalAmount) || 0).toFixed(2)}</span></div>
                  </div>
                  <div className="b2b-a4-footer">
                    <p>Thank you for your business</p>
                  </div>
                </div>
              </div>
              <div className="bill-preview-actions">
                {isDraft ? (
                  <>
                    <button className="print-btn" onClick={() => saveInvoice(false)} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                    <button className="print-btn" onClick={() => saveInvoice(true)} disabled={loading}>{loading ? 'Saving...' : 'Save & Print'}</button>
                    <button className="secondary-btn" onClick={() => { setPreviewDraft(null); setShowPreview(false); }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="print-btn" onClick={() => handlePrintInvoice(lastInvoice)}><Printer size={18} /> Print Invoice</button>
                    <button className="secondary-btn" onClick={() => setShowPreview(false)}>Done</button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default B2BBilling;
