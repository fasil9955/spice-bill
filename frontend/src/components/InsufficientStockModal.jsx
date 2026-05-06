import React, { useState, useEffect } from 'react';
import { productService } from '../services/api';
import { X, PackagePlus } from 'lucide-react';
import './InsufficientStockModal.css';

/**
 * Lets user add inbound stock from billing when a line would exceed available qty.
 */
export default function InsufficientStockModal({
  open,
  productId,
  productName,
  unit,
  currentStock,
  requestedTotalQty,
  qtyDecimals = 3,
  onClose,
  onStockAdded,
}) {
  const shortfall = Math.max(0, (Number(requestedTotalQty) || 0) - (Number(currentStock) || 0));
  const [addQtyInput, setAddQtyInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const sf = Math.max(0, (Number(requestedTotalQty) || 0) - (Number(currentStock) || 0));
      const defaultAdd = sf > 0 ? sf : 0.001;
      setAddQtyInput(String(Number(defaultAdd.toFixed(qtyDecimals))));
      setSaving(false);
    }
  }, [open, productId, currentStock, requestedTotalQty, qtyDecimals]);

  if (!open || productId == null) return null;

  const u = unit ? ` ${unit}` : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const num = parseFloat(String(addQtyInput).replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) {
      alert('Enter a positive quantity to add to inventory.');
      return;
    }
    setSaving(true);
    try {
      await productService.adjustStock(productId, num);
      const res = await productService.getById(productId);
      const fresh = res?.data;
      if (!fresh) throw new Error('No product returned');
      onStockAdded?.(fresh);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to add stock.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="insufficient-stock-overlay" role="dialog" aria-modal="true" aria-labelledby="insufficient-stock-title">
      <div className="insufficient-stock-modal" onClick={(e) => e.stopPropagation()}>
        <div className="insufficient-stock-header">
          <h2 id="insufficient-stock-title"><PackagePlus size={22} /> Insufficient stock</h2>
          <button type="button" className="insufficient-stock-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="insufficient-stock-product"><strong>{productName || 'Product'}</strong></p>
        <ul className="insufficient-stock-summary">
          <li>Available now:{u} <strong>{currentStock}</strong></li>
          <li>Quantity needed on this bill:{u} <strong>{requestedTotalQty}</strong></li>
          <li className="insufficient-stock-short">Short by:{u} <strong>{shortfall.toFixed(qtyDecimals)}</strong></li>
        </ul>
        <form onSubmit={handleSubmit} className="insufficient-stock-form">
          <label htmlFor="insufficient-stock-add">Add to inventory ({unit?.trim() || 'qty'})</label>
          <input
            id="insufficient-stock-add"
            type="text"
            inputMode="decimal"
            value={addQtyInput}
            onChange={(e) => setAddQtyInput(e.target.value)}
            className="insufficient-stock-input"
            disabled={saving}
          />
          <p className="insufficient-stock-hint">
            This updates product stock immediately. Then your cart change is applied.
          </p>
          <div className="insufficient-stock-actions">
            <button type="button" className="insufficient-stock-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="insufficient-stock-submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add stock & continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
