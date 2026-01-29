import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService, invoiceService } from '../services/api';
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
  X
} from 'lucide-react';

const Billing = () => {
  const [cart, setCart] = useState([]);
  const [barcode, setBarcode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amounts, setAmounts] = useState({ cash: 0, card: 0, upi: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const barcodeInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode) return;
    try {
      const response = await productService.getByBarcode(barcode);
      addToCart(response.data);
      setBarcode('');
    } catch (err) {
      alert('Product not found or out of stock');
    }
  };

  const handleSearch = async (val) => {
    setSearchTerm(val);
    if (val.length > 2) {
      // In a real app, we'd have a search endpoint. 
      // For now, let's filter from all products or use a placeholder
      try {
        const response = await productService.getAll();
        const filtered = response.data.filter(p => 
          (p.productName || '').toLowerCase().includes(val.toLowerCase()) || 
          (p.barcode || '').includes(val)
        );
        setSearchResults(filtered);
      } catch (err) {}
    } else {
      setSearchResults([]);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.productId);
      if (existing) {
        return prev.map(item => 
          item.productId === product.productId 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, unitPrice: product.sellingPricePerUnit, quantity: 1 }];
    });
    setSearchResults([]);
    setSearchTerm('');
    barcodeInputRef.current?.focus();
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

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const calculateTotal = () => calculateSubtotal(); // Add taxes/discounts if needed

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const invoiceData = {
        invoiceType: 'RETAIL',
        paymentMethod: paymentMethod,
        cashAmount: paymentMethod === 'MIXED' ? amounts.cash : (paymentMethod === 'CASH' ? calculateTotal() : 0),
        cardAmount: paymentMethod === 'MIXED' ? amounts.card : (paymentMethod === 'CARD' ? calculateTotal() : 0),
        upiAmount: paymentMethod === 'MIXED' ? amounts.upi : (paymentMethod === 'UPI' ? calculateTotal() : 0),
        items: cart.map(item => ({
          product: { productId: item.productId },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: 0
        }))
      };

      const response = await invoiceService.create(invoiceData);
      setLastInvoice(response.data);
      setShowPreview(true);
      setCart([]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-container">
      <div className="billing-header">
        <div className="billing-header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1>🧾 Billing Terminal</h1>
        </div>
        <div className="barcode-form">
          <form onSubmit={handleBarcodeSubmit} className="barcode-input-group">
            <input 
              ref={barcodeInputRef}
              type="text" 
              className="barcode-input"
              placeholder="Scan Barcode..." 
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </form>
          <div className="product-search-wrapper">
            <input 
              type="text"
              className="product-search-input"
              placeholder="Search Product Name..." 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="product-search-dropdown">
                {searchResults.map(p => (
                  <div key={p.productId} className="product-search-item" onClick={() => addToCart(p)}>
                    <span>{p.productName}</span>
                    <span>₹{p.unitPrice}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="billing-content">
        <div className="billing-main-content">
          <div className="cart-section">
          <div className="section-header">
            <ShoppingCart size={20} />
            <h2>Current Cart ({cart.length} items)</h2>
          </div>
          <div className="cart-table-wrapper">
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr><td colSpan="5" className="empty-cart">Cart is empty. Scan or search for products.</td></tr>
                ) : cart.map(item => (
                  <tr key={item.productId}>
                    <td>{item.productName}</td>
                    <td>₹{item.unitPrice}</td>
                    <td>
                      <div className="quantity-control">
                        <button onClick={() => updateQuantity(item.productId, -1)}><Minus size={14}/></button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, 1)}><Plus size={14}/></button>
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
              <span>Subtotal</span>
              <span>₹{calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="totals-row total-amount">
              <span>Total Amount</span>
              <span>₹{calculateTotal().toFixed(2)}</span>
            </div>
            
            <div className="payment-section">
              <h3>Payment Method</h3>
              <div className="payment-options">
                <button 
                  className={`payment-btn ${paymentMethod === 'CASH' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('CASH')}
                >
                  <Banknote size={20} /> Cash
                </button>
                <button 
                  className={`payment-btn ${paymentMethod === 'CARD' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('CARD')}
                >
                  <CreditCard size={20} /> Card
                </button>
                <button 
                  className={`payment-btn ${paymentMethod === 'UPI' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('UPI')}
                >
                  <QrCode size={20} /> UPI
                </button>
              </div>
            </div>

            <button 
              className="submit-btn checkout-btn" 
              disabled={cart.length === 0 || loading}
              onClick={handleCheckout}
            >
              {loading ? 'Processing...' : 'Complete Sale & Print'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {showPreview && lastInvoice && (
        <div className="bill-preview-overlay">
          <div className="bill-preview-container">
            <div className="bill-preview-header">
              <h2>Invoice Preview</h2>
              <button className="close-btn" onClick={() => setShowPreview(false)}>×</button>
            </div>
            <div className="bill-preview-content" id="printable-bill">
              <div className="bill-header">
                <h3>🌶️ Spices Billing</h3>
                <p>{lastInvoice.cashier?.companyName || 'Our Spices Shop'}</p>
                <p>Date: {new Date(lastInvoice.createdAt).toLocaleString()}</p>
                <p>Inv #: {lastInvoice.invoiceNumber}</p>
              </div>
              <div className="bill-divider"></div>
              <div className="bill-items">
                {lastInvoice.items?.map(item => (
                  <div key={item.itemId} className="bill-item-row">
                    <span>{item.productName} x {item.quantity}</span>
                    <span>₹{item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="bill-divider"></div>
              <div className="bill-totals">
                <div className="bill-total-row">
                  <span>Total</span>
                  <span>₹{lastInvoice.totalAmount.toFixed(2)}</span>
                </div>
                <p>Payment: {lastInvoice.paymentMethod}</p>
              </div>
              <div className="bill-footer">
                <p>Thank you for shopping!</p>
              </div>
            </div>
            <div className="bill-preview-actions">
              <button className="print-btn" onClick={() => window.print()}>
                <Printer size={18} /> Print Invoice
              </button>
              <button className="secondary-btn" onClick={() => setShowPreview(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
