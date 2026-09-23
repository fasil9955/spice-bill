/**
 * Fast in-memory product search & barcode parse (mirrors backend ProductService.parseBarcodeWithWeight).
 * Avoids calling GET /products on every keystroke during scanner input.
 */

/** Strip scanner control chars / AIM prefix (e.g. ]C1) and trim. */
export function normalizeBarcode(raw) {
  let code = String(raw || '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (/^\][A-Za-z0-9]{1,2}/.test(code)) {
    code = code.replace(/^\][A-Za-z0-9]{1,2}/, '');
  }
  return code;
}

/** True for HID scanner payloads (shop labels 1000A / 1000A250, EAN/UPC, mixed codes). */
export function looksLikeScannedBarcode(code) {
  const c = normalizeBarcode(code);
  if (c.length < 4) return false;
  if (!/^[A-Za-z0-9]+$/.test(c)) return false;
  if (/^\d+[A-Za-z]\d*$/.test(c)) return true;
  if (/^\d{8,14}$/.test(c)) return true;
  const digits = (c.match(/\d/g) || []).length;
  return c.length >= 6 && digits >= 3;
}

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
  const code = normalizeBarcode(fullBarcode);
  if (!code) return null;
  const codeUpper = code.toUpperCase();

  const byBarcode = new Map();
  for (const p of list) {
    const b = normalizeBarcode(p.barcode);
    if (!b) continue;
    byBarcode.set(b, p);
    byBarcode.set(b.toUpperCase(), p);
  }

  const exact = byBarcode.get(code) || byBarcode.get(codeUpper);
  if (exact) {
    return { product: exact, weight: 0 };
  }

  // Numeric-only scan of a shop code stored as 1000A
  if (/^\d+$/.test(code)) {
    const withA = byBarcode.get(`${code}A`) || byBarcode.get(`${code}a`);
    if (withA) return { product: withA, weight: 0 };
  }

  // Longest stored barcode that is a prefix; remainder is weight (grams/ml)
  let best = null;
  for (const [b, p] of byBarcode.entries()) {
    const base = b.toUpperCase();
    if (base.length >= codeUpper.length) continue;
    if (!codeUpper.startsWith(base)) continue;
    const rest = codeUpper.slice(base.length);
    if (!/^\d+$/.test(rest)) continue;
    if (!best || base.length > best.baseLength) {
      const weight = Number(rest);
      if (Number.isFinite(weight)) {
        best = { product: p, weight, baseLength: base.length };
      }
    }
  }
  if (best) return { product: best.product, weight: best.weight };

  const m = code.match(/^(.+?[A-Za-z])(\d+)$/);
  if (m) {
    const base = m[1];
    const product = byBarcode.get(base) || byBarcode.get(base.toUpperCase());
    if (product) {
      const weight = Number(m[2]);
      if (Number.isFinite(weight)) {
        return { product, weight };
      }
    }
  }

  return null;
}

/**
 * Hybrid barcode resolve: local cache first (fast), then API parse.
 * If both miss, refresh the full product list and retry once.
 *
 * @param {object[]} productsCache current cached list
 * @param {string} fullBarcode scanned code
 * @param {{ parseBarcodeApi: (code: string) => Promise<any>, refreshProducts: () => Promise<object[]> }} deps
 * @returns {Promise<{ product: object, weight: number, productsCache: object[] } | null>}
 */
export async function resolveBarcodeHybrid(productsCache, fullBarcode, deps) {
  const code = normalizeBarcode(fullBarcode);
  if (!code) return null;

  const { parseBarcodeApi, refreshProducts } = deps || {};
  let cache = Array.isArray(productsCache) ? productsCache : [];

  const fromApi = async () => {
    if (typeof parseBarcodeApi !== 'function') return null;
    try {
      const response = await parseBarcodeApi(code);
      const product = response?.data?.product || null;
      if (!product) return null;
      const weight = response?.data?.weight != null ? Number(response.data.weight) : 0;
      cache = upsertProductInList(cache, product);
      return { product, weight: Number.isFinite(weight) ? weight : 0, productsCache: cache };
    } catch {
      return null;
    }
  };

  // 1) Instant local
  const local = parseBarcodeLocal(cache, code);
  if (local?.product) {
    return { product: local.product, weight: local.weight || 0, productsCache: cache, source: 'local-cache' };
  }

  // 2) API parse (new product / cache stale)
  const apiHit = await fromApi();
  if (apiHit) return { ...apiHit, source: 'api' };

  // 3) Refresh full list, then retry local + API once
  if (typeof refreshProducts === 'function') {
    try {
      const fresh = await refreshProducts();
      if (Array.isArray(fresh)) cache = fresh;
    } catch {
      /* keep cache */
    }
  }

  const localRetry = parseBarcodeLocal(cache, code);
  if (localRetry?.product) {
    return { product: localRetry.product, weight: localRetry.weight || 0, productsCache: cache, source: 'local-after-refresh' };
  }

  const apiRetry = await fromApi();
  if (apiRetry) return { ...apiRetry, source: 'api-after-refresh' };

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
