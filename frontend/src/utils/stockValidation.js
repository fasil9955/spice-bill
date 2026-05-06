/** Small tolerance for float compares (kg / decimal qty). */
const EPS = 1e-9;

/**
 * Inventory quantity from API product (null = unknown / do not enforce).
 */
export function parseProductStock(product) {
  if (!product || product.quantity === undefined || product.quantity === null || product.quantity === '') {
    return null;
  }
  const n = Number(product.quantity);
  return Number.isFinite(n) ? n : null;
}

/** Single cart line per productId (billing / edit). */
export function lineQtyForProductId(lines, productId) {
  const row = lines.find((l) => l.productId === productId);
  return row ? Number(row.quantity) || 0 : 0;
}

/**
 * For add-to-cart: prefer live API product qty; fallback to snapshot on existing line.
 */
export function getStockCeilingForAdd(product, existingLine) {
  const fromProduct = parseProductStock(product);
  if (fromProduct !== null) return fromProduct;
  if (existingLine?.stockOnHand != null) {
    const n = Number(existingLine.stockOnHand);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function wouldExceedStock(ceiling, qtyAlreadyInCart, qtyToAdd) {
  if (ceiling === null) return false;
  const total = qtyAlreadyInCart + qtyToAdd;
  return total > ceiling + EPS;
}

export function wouldExceedStockDirect(ceiling, newLineQty) {
  if (ceiling === null) return false;
  return newLineQty > ceiling + EPS;
}

export function formatInsufficientStockAlert({
  productName,
  unit,
  available,
  inCart,
  tryingToAdd,
}) {
  const u = unit ? ` ${unit}` : '';
  const name = productName || 'This product';
  return (
    `Insufficient stock for "${name}".\n\n` +
    `Available:${u} ${available}\n` +
    `Already in cart:${u} ${inCart}\n` +
    `You tried to add:${u} ${tryingToAdd}`
  );
}

/**
 * Edit invoice: current DB stock already reflects this sale. Allow up to DB + original qty on this invoice.
 * Pass productForStock for a freshly loaded product when React state is not updated yet.
 */
export function getEditInvoiceMaxQty(products, productId, initialQtyByProductId, productForStock = null) {
  const p = productForStock ?? products.find((x) => x.productId === productId);
  const db = parseProductStock(p);
  if (db === null) return null;
  const originallyInvoiced = Number(initialQtyByProductId?.[productId]) || 0;
  return db + originallyInvoiced;
}
