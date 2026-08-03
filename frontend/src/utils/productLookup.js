/**
 * Fast in-memory product search & barcode parse (mirrors backend ProductService.parseBarcodeWithWeight).
 * Avoids calling GET /products on every keystroke during scanner input.
 */

const WEIGHT_BARCODE_RE = /^(.+?[A-Za-z])(\d+)$/;

/** Filter products by name or barcode substring (case-insensitive). */
export function filterProductsLocal(products, query) {
  const list = Array.isArray(products) ? products : [];
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return list.filter((p) => {
    const name = (p.productName || '').toLowerCase();
    const barcode = (p.barcode || '').toLowerCase();
    return name.includes(q) || barcode.includes(q);
  });
}

/**
 * Resolve barcode against a cached product list.
 * @returns {{ product: object, weight: number } | null}
 *   weight is grams/ml from suffix (0 if exact barcode match / no weight).
 */
export function parseBarcodeLocal(products, fullBarcode) {
  const list = Array.isArray(products) ? products : [];
  const code = (fullBarcode || '').trim();
  if (!code) return null;

  const byBarcode = new Map();
  for (const p of list) {
    const b = (p.barcode || '').trim();
    if (b) byBarcode.set(b, p);
  }

  const exact = byBarcode.get(code);
  if (exact) {
    return { product: exact, weight: 0 };
  }

  const m = code.match(WEIGHT_BARCODE_RE);
  if (m) {
    const base = m[1];
    const weightStr = m[2];
    const product = byBarcode.get(base);
    if (product) {
      const weight = Number(weightStr);
      if (Number.isFinite(weight)) {
        return { product, weight };
      }
    }
  }

  return null;
}

/** Convert barcode weight (grams/ml) to cart qty based on product unit. */
export function qtyFromBarcodeWeight(product, weight) {
  if (weight == null || !(Number(weight) > 0)) return 1;
  const w = Number(weight);
  const unit = (product?.unit || '').toLowerCase();
  const qty = unit === 'kg' || unit === 'l' ? w / 1000 : w;
  return parseFloat(Number(qty).toFixed(6));
}

/** Upsert one product into a list (by productId). */
export function upsertProductInList(products, fresh) {
  if (!fresh?.productId) return Array.isArray(products) ? products : [];
  const list = Array.isArray(products) ? products : [];
  const idx = list.findIndex((p) => p.productId === fresh.productId);
  if (idx < 0) return [fresh, ...list];
  const next = list.slice();
  next[idx] = { ...list[idx], ...fresh };
  return next;
}
