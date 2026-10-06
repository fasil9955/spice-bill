import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService, invoiceService, authService } from '../services/api';
import { formatPrintMultiline, companyPrintContact } from '../utils/invoicePrint';
import { broadcastDataUpdate } from '../utils/dataSync';
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
  Phone,
  PauseCircle
} from 'lucide-react';
import {
  getStockCeilingForAdd,
  wouldExceedStock,
  wouldExceedStockDirect,
  parseProductStock,
} from '../utils/stockValidation';
import InsufficientStockModal from '../components/InsufficientStockModal';
import {
  filterProductsLocal,
  qtyFromBarcodeWeight,
  parseBarcodeLocal,
  upsertProductInList,
  resolveBarcodeHybrid,
  normalizeBarcode,
  looksLikeScannedBarcode,
} from '../utils/productLookup';

const DISCOUNT_PERCENT_MAX = 30;
const BILLING_CART_KEY = 'spice_billing_cart';
const BILLING_CARTS_KEY = 'spice_billing_carts';

const newCartId = () => `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const createEmptySession = (index = 1) => ({
  id: newCartId(),
  label: `Cart ${index}`,
  customerName: '',
  cart: [],
  paymentMethod: 'CASH',
  amounts: { cash: 0, card: 0, upi: 0 },
  discountType: 'percent',
  discountPercent: 0,
  discountAmount: 0,
});

const loadBillingSessions = () => {
  try {
    const saved = localStorage.getItem(BILLING_CARTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
        const sessions = parsed.sessions.map((s, i) => ({
          ...createEmptySession(i + 1),
          ...s,
          amounts: { cash: 0, card: 0, upi: 0, ...(s.amounts || {}) },
          cart: Array.isArray(s.cart) ? s.cart : [],
          customerName: s.customerName || '',
        }));
        const activeId = sessions.some((s) => s.id === parsed.activeId)
          ? parsed.activeId
          : sessions[0].id;
        return { sessions, activeId };
      }
    }
    const legacy = localStorage.getItem(BILLING_CART_KEY);
    if (legacy) {
      const cart = JSON.parse(legacy);
      if (Array.isArray(cart) && cart.length > 0) {
        const session = { ...createEmptySession(1), cart };
        return { sessions: [session], activeId: session.id };
      }
    }
  } catch {
    /* fall through to empty session */
  }
  const session = createEmptySession(1);
  return { sessions: [session], activeId: session.id };
};

const Billing = () => {
  const initialBilling = useRef(null);
  if (!initialBilling.current) {
    initialBilling.current = loadBillingSessions();
  }
  const [sessions, setSessions] = useState(initialBilling.current.sessions);
  const [activeId, setActiveId] = useState(initialBilling.current.activeId);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [previewDraft, setPreviewDraft] = useState(null); // draft with invoice number before save
  const [lastInvoice, setLastInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingQty, setEditingQty] = useState({});
  const [selectedForCart, setSelectedForCart] = useState(null); // product selected from search, pending qty + add
  const [selectedQtyInput, setSelectedQtyInput] = useState(''); // string so user can type 0.25, 0, etc.; default empty (nil)
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  // Tracks whether user navigated the search results with arrow keys (so Enter should pick a highlighted item)
  const usedSearchArrowsRef = useRef(false);
  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const selectedQtyRef = useRef(null);
  const handlePreviewRef = useRef(null);
  const handleSaveAndPrintRef = useRef(null);
  const confirmPaymentAndPreviewRef = useRef(null);
  const insufficientRetryRef = useRef(null);
  /** Cached products for fast local search / barcode parse (loaded once). */
  const productsCacheRef = useRef([]);
  const searchDebounceRef = useRef(null);
  const lastInputAtRef = useRef(0);
  const scanTraceRef = useRef({ keys: [], startedAt: 0 });
  const [showScanTiming, setShowScanTiming] = useState(() => localStorage.getItem('spice_scan_timing') === '1');
  const [scanReports, setScanReports] = useState([]);
  const navigate = useNavigate();

  const [insufficientStockContext, setInsufficientStockContext] = useState(null);

  const activeSession = sessions.find((s) => s.id === activeId) || sessions[0] || createEmptySession(1);
  const cart = activeSession.cart || [];
  const paymentMethod = activeSession.paymentMethod || 'CASH';
  const amounts = activeSession.amounts || { cash: 0, card: 0, upi: 0 };
  const discountType = activeSession.discountType || 'percent';
  const discountPercent = activeSession.discountPercent || 0;
  const discountAmount = activeSession.discountAmount || 0;

  const patchActive = (patchOrFn) => {
    setSessions((prev) => prev.map((s) => {
      if (s.id !== activeId) return s;
      const patch = typeof patchOrFn === 'function' ? patchOrFn(s) : patchOrFn;
      return { ...s, ...patch };
    }));
  };

  const setCart = (updater) => {
    setSessions((prev) => prev.map((s) => {
      if (s.id !== activeId) return s;
      const next = typeof updater === 'function' ? updater(s.cart || []) : updater;
      return { ...s, cart: next };
    }));
  };

  const setPaymentMethod = (value) => patchActive({ paymentMethod: value });
  const setAmounts = (updater) => {
    patchActive((s) => ({
      amounts: typeof updater === 'function' ? updater(s.amounts || { cash: 0, card: 0, upi: 0 }) : updater,
    }));
  };
  const setDiscountType = (value) => patchActive({ discountType: value });
  const setDiscountPercent = (value) => patchActive({ discountPercent: value });
  const setDiscountAmount = (value) => patchActive({ discountAmount: value });

  const resetPendingProductUi = () => {
    setSelectedForCart(null);
    setSelectedQtyInput('');
    setEditingQty({});
    setSearchResults([]);
    setHighlightedIndex(-1);
    setSearchTerm('');
    setShowPreview(false);
    setPreviewDraft(null);
  };

  const switchCart = (id) => {
    if (!id || id === activeId) return;
    resetPendingProductUi();
    setActiveId(id);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const holdAndNewCart = () => {
    if ((activeSession.cart || []).length === 0) {
      alert('Add items to this cart first, then hold it to bill another customer.');
      return;
    }
    const next = createEmptySession(sessions.length + 1);
    resetPendingProductUi();
    setSessions((prev) => [...prev, next]);
    setActiveId(next.id);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const closeCart = (id, e) => {
    e?.stopPropagation?.();
    const target = sessions.find((s) => s.id === id);
    if (target?.cart?.length > 0 && !window.confirm('Close this held cart? Items in it will be discarded.')) {
      return;
    }
    if (sessions.length === 1) {
      const reset = { ...createEmptySession(1), id: sessions[0].id, label: 'Cart 1' };
      setSessions([reset]);
      setActiveId(reset.id);
      resetPendingProductUi();
      return;
    }
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeId === id) {
      resetPendingProductUi();
      setActiveId(remaining[0].id);
    }
  };

  const cartTabLabel = (session, index) => {
    const name = (session.customerName || '').trim();
    if (name) return name;
    return session.label || `Cart ${index + 1}`;
  };

  const syncProductsCache = (list) => {
    productsCacheRef.current = Array.isArray(list) ? list : [];
  };

  const refreshProductsCache = useCallback(async () => {
    try {
      const res = await productService.getAll();
      const list = Array.isArray(res?.data) ? res.data : [];
      syncProductsCache(list);
      return list;
    } catch {
      /* keep existing cache if network is still waking up */
      return productsCacheRef.current;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await productService.getAll();
        if (!cancelled) syncProductsCache(res?.data || []);
      } catch {
        if (!cancelled) syncProductsCache([]);
      }
    })();
    return () => {
      cancelled = true;
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // Keep cache fresh while billing stays open (new products / barcode edits)
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshProductsCache();
      }
    }, 2 * 60 * 1000); // every 2 minutes
    return () => clearInterval(id);
  }, [refreshProductsCache]);

  useEffect(() => {
    handlePreviewRef.current = handlePreview;
  });
  useEffect(() => {
    handleSaveAndPrintRef.current = handleSaveAndPrint;
  });
  useEffect(() => {
    confirmPaymentAndPreviewRef.current = confirmPaymentAndPreview;
  });

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // After PC sleep / unlock / tab return: refocus search + refresh product cache.
  // Without this, scanner input goes nowhere (focus lost) and lookups can miss.
  const blockScanFocusRef = useRef(false);
  const applyScannedCodeRef = useRef(null);

  useEffect(() => {
    blockScanFocusRef.current = !!(showPreview || selectedForCart || insufficientStockContext);
  }, [showPreview, selectedForCart, insufficientStockContext]);

  useEffect(() => {
    let wasHidden = document.visibilityState === 'hidden';

    const resumeAfterWake = () => {
      refreshProductsCache();
      const tryFocus = () => {
        if (document.visibilityState !== 'visible') return;
        if (blockScanFocusRef.current) return;
        searchInputRef.current?.focus();
      };
      // Windows unlock focus is flaky — try twice
      setTimeout(tryFocus, 100);
      setTimeout(tryFocus, 500);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
        return;
      }
      if (!wasHidden) return;
      wasHidden = false;
      resumeAfterWake();
    };

    const onPageShow = (e) => {
      // Only when restored from browser bfcache (common after sleep / back-forward)
      if (e.persisted) resumeAfterWake();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [refreshProductsCache]);

  // Shortcut: Ctrl+Enter opens payment popup, then preview
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Enter' && e.ctrlKey && cart.length > 0 && !loading && !showPreview) {
        e.preventDefault();
        if (showPaymentModal) {
          confirmPaymentAndPreviewRef.current?.();
        } else {
          setShowPaymentModal(true);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [cart.length, loading, showPreview, showPaymentModal]);

  // When payment popup is open: Enter continues
  useEffect(() => {
    if (!showPaymentModal) return;
    const onKeyDown = (e) => {
      if (e.key === 'Enter' && !e.ctrlKey && !loading) {
        e.preventDefault();
        confirmPaymentAndPreviewRef.current?.();
      }
      if (e.key === 'Escape') {
        setShowPaymentModal(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showPaymentModal, loading]);

  // When bill preview modal is open (draft): Enter triggers Save & Print
  useEffect(() => {
    if (!showPreview || !previewDraft) return;
    const onKeyDown = (e) => {
      if (e.key === 'Enter' && !e.ctrlKey && !loading) {
        e.preventDefault();
        handleSaveAndPrintRef.current?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showPreview, previewDraft, loading]);

  useEffect(() => {
    localStorage.setItem(BILLING_CARTS_KEY, JSON.stringify({ sessions, activeId }));
    localStorage.removeItem(BILLING_CART_KEY);
  }, [sessions, activeId]);

  const handleSearchChange = (val) => {
    const trimmed = (val || '').trim();
    setSearchTerm(val);
    usedSearchArrowsRef.current = false;

    const now = Date.now();
    const gap = lastInputAtRef.current ? now - lastInputAtRef.current : 0;
    lastInputAtRef.current = now;

    const trace = scanTraceRef.current;
    if (!trace.startedAt || gap > 400) {
      scanTraceRef.current = { keys: [], startedAt: now };
    }
    scanTraceRef.current.keys.push({
      ch: val.slice(-1) || '',
      len: val.length,
      gapMs: gap,
      burst: gap > 0 && gap < 80,
      at: now,
    });

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    if (!trimmed) {
      setSearchResults([]);
      setHighlightedIndex(-1);
      return;
    }

    // Barcode scanners fire keys very fast (< ~40ms). Skip dropdown spam during the burst;
    // Enter will resolve the full code from the cached list.
    const looksLikeScannerBurst = gap > 0 && gap < 80;
    if (looksLikeScannerBurst) {
      return;
    }

    // Local filter only (no network) — products loaded once on page open
    const applyFilter = () => {
      const filtered = filterProductsLocal(productsCacheRef.current, trimmed);
      setSearchResults(filtered.slice(0, 40));
      setHighlightedIndex(filtered.length > 0 ? 0 : -1);
    };

    // Short debounce for normal typing; instant if cache already warm and single-char pause
    searchDebounceRef.current = setTimeout(applyFilter, 60);
  };

  const formatQtyForInput = (qty) => {
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) return '';
    return String(parseFloat(n.toFixed(6)));
  };

  const isLikelyScannerSubmit = () => {
    const keys = scanTraceRef.current?.keys || [];
    if (keys.length < 4) return false;
    const gaps = keys.map((k) => k.gapMs).filter((g) => g > 0 && g < 400);
    if (!gaps.length) return false;
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return avg < 55;
  };

  const openProductQtyStrip = (product, qtyStr = '') => {
    if (!product) return;
    setSelectedForCart(product);
    setSelectedQtyInput(qtyStr || '');
    setSearchResults([]);
    setHighlightedIndex(-1);
    setSearchTerm('');
    usedSearchArrowsRef.current = false;
    setTimeout(() => selectedQtyRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (highlightedIndex < 0) return;
    const row = searchDropdownRef.current?.querySelector(`[data-search-idx="${highlightedIndex}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, searchResults.length]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown' && searchResults.length > 0) {
      e.preventDefault();
      usedSearchArrowsRef.current = true;
      setHighlightedIndex((i) => {
        const start = i < 0 ? -1 : i;
        return Math.min(start + 1, searchResults.length - 1);
      });
      return;
    }
    if (e.key === 'ArrowUp' && searchResults.length > 0) {
      e.preventDefault();
      usedSearchArrowsRef.current = true;
      setHighlightedIndex((i) => Math.max(i < 0 ? 0 : i - 1, 0));
      return;
    }

    // Enter key behaviour:
    // - If user navigated dropdown with arrows and a product is highlighted, Enter selects that product.
    // - Otherwise (typical barcode scan), resolve immediately from local cache (fallback API).
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      const enterAt = Date.now();
      const scanner = isLikelyScannerSubmit();
      const waitMs = scanner ? 80 : 0;
      setTimeout(() => {
        runSearchSubmit({
          enterAt,
          waitMs,
          preferScanner: scanner,
          usedArrows: usedSearchArrowsRef.current,
        });
      }, waitMs);
      return;
    }

    if (e.key === 'Escape') {
      setSearchResults([]);
      setHighlightedIndex(-1);
      searchInputRef.current?.blur();
    }
  };

  const returnFocusToSearch = () => {
    if (showPreview || selectedForCart || insufficientStockContext) return;
    searchInputRef.current?.focus();
  };

  const pushScanReport = (report) => {
    setScanReports((prev) => [report, ...prev].slice(0, 8));
  };

  const finishScanReport = (extra) => {
    const trace = scanTraceRef.current || { keys: [], startedAt: 0 };
    const keys = trace.keys || [];
    const gaps = keys.map((k) => k.gapMs).filter((g) => g > 0 && g < 400);
    const lastKeyAt = keys.length ? keys[keys.length - 1].at : 0;
    const gunMs = keys.length >= 2 && trace.startedAt ? lastKeyAt - trace.startedAt : 0;
    const enterAfterLastCharMs =
      extra.enterAt && lastKeyAt ? extra.enterAt - lastKeyAt : null;
    pushScanReport({
      at: new Date().toLocaleTimeString(),
      code: extra.code || '',
      keys: keys.length,
      gunMs,
      avgGap: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0,
      maxGap: gaps.length ? Math.max(...gaps) : 0,
      burstKeys: keys.filter((k) => k.burst).length,
      enterWaitMs: extra.waitMs ?? 80,
      enterAfterLastCharMs,
      lookupMs: Math.round(extra.lookupMs || 0),
      source: extra.source || '',
      result: extra.result,
      product: extra.product || '',
      qty: extra.qty,
    });
    scanTraceRef.current = { keys: [], startedAt: 0 };
  };

  const runSearchSubmit = async (timing = {}) => {
    const searchEl = searchInputRef.current;
    const rawInput = searchEl?.value;
    const trimmed = normalizeBarcode(typeof rawInput === 'string' ? rawInput : searchTerm || '');
    const lookupStarted = performance.now();
    if (!trimmed) {
      searchEl?.focus();
      return;
    }
    if (timing.preferScanner) {
      const applied = await applyScannedCodeRef.current?.(trimmed, { ...timing, lookupStarted });
      if (applied) return;
    }

    const parsed = parseBarcodeLocal(productsCacheRef.current, trimmed);
    if (!timing.usedArrows) {
      let product = parsed?.product || null;
      let weight = parsed?.weight || 0;
      if (!product && looksLikeScannedBarcode(trimmed)) {
        const resolved = await resolveBarcodeHybrid(productsCacheRef.current, trimmed, {
          parseBarcodeApi: (code) => productService.parseBarcode(code),
          refreshProducts: refreshProductsCache,
        });
        if (resolved?.productsCache) syncProductsCache(resolved.productsCache);
        if (resolved?.product) {
          product = resolved.product;
          weight = resolved.weight || 0;
        }
      }
      if (product) {
        const qtyStr = weight > 0
          ? formatQtyForInput(qtyFromBarcodeWeight(product, weight))
          : '';
        openProductQtyStrip(product, qtyStr);
        finishScanReport({
          ...timing,
          code: trimmed,
          lookupMs: performance.now() - lookupStarted,
          source: 'typed-barcode',
          result: weight > 0 ? 'QTY STRIP (WEIGHT)' : 'QTY STRIP',
          product: product.productName,
          qty: qtyStr || undefined,
        });
        return;
      }
    }

    const pickIndex = highlightedIndex >= 0 ? highlightedIndex : 0;
    const fromDropdown = searchResults.length > 0 ? searchResults[pickIndex] : null;
    const filtered = filterProductsLocal(productsCacheRef.current, trimmed);
    const chosen = fromDropdown || (filtered.length >= 1 ? filtered[0] : null);

    if (chosen) {
      let qtyStr = '';
      if (parsed?.product?.productId === chosen.productId && parsed.weight > 0) {
        qtyStr = formatQtyForInput(qtyFromBarcodeWeight(chosen, parsed.weight));
      }
      openProductQtyStrip(chosen, qtyStr);
    } else {
      alert('Product not found. Scan barcode or type name to search.');
      searchInputRef.current?.focus();
    }
    finishScanReport({
      ...timing,
      code: trimmed,
      lookupMs: performance.now() - lookupStarted,
      source: 'name-search',
      result: filtered.length ? `NAME (${filtered.length} matches)` : 'NOT FOUND',
      product: filtered[0]?.productName || '',
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    runSearchSubmit();
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
    setSelectedQtyInput('');
    searchInputRef.current?.focus();
  };

  const addToCart = (product, initialQty = 1) => {
    const qty = typeof initialQty === 'number' && initialQty > 0 ? initialQty : 1;
    const roundedQty = parseFloat(Number(qty).toFixed(3));
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.productId);
      const currentInCart = existing ? Number(existing.quantity) || 0 : 0;
      const ceiling = getStockCeilingForAdd(product, existing);
      if (wouldExceedStock(ceiling, currentInCart, roundedQty)) {
        insufficientRetryRef.current = { type: 'ADD_CART', qty: roundedQty };
        setInsufficientStockContext({
          product,
          ceiling,
          requestedTotalQty: currentInCart + roundedQty,
        });
        return prev;
      }
      const incomingStock = parseProductStock(product);
      const stockSnapshot = incomingStock !== null ? incomingStock : existing?.stockOnHand ?? null;
      if (existing) {
        return prev.map(item =>
          item.productId === product.productId
            ? {
                ...item,
                quantity: parseFloat(Number(item.quantity + roundedQty).toFixed(3)),
                stockOnHand: stockSnapshot ?? item.stockOnHand,
              }
            : item
        );
      }
      return [
        {
          ...product,
          unitPrice: product.sellingPricePerUnit,
          quantity: roundedQty,
          stockOnHand: stockSnapshot,
        },
        ...prev,
      ];
    });
    setSearchResults([]);
    setSearchTerm('');
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  applyScannedCodeRef.current = async (rawCode, timing = {}) => {
    const trimmed = normalizeBarcode(rawCode);
    if (!trimmed) return false;
    setSelectedForCart(null);
    setSelectedQtyInput('');
    const t0 = timing.lookupStarted || performance.now();
    const resolved = await resolveBarcodeHybrid(productsCacheRef.current, trimmed, {
      parseBarcodeApi: (code) => productService.parseBarcode(code),
      refreshProducts: refreshProductsCache,
    });
    const lookupMs = performance.now() - t0;
    if (resolved?.productsCache) {
      syncProductsCache(resolved.productsCache);
    }
    if (resolved?.product) {
      const qty = qtyFromBarcodeWeight(resolved.product, resolved.weight || 0);
      addToCart(resolved.product, qty);
      setSearchTerm('');
      setSearchResults([]);
      setHighlightedIndex(-1);
      if (searchInputRef.current) searchInputRef.current.value = '';
      setTimeout(() => searchInputRef.current?.focus(), 0);
      finishScanReport({
        ...timing,
        code: trimmed,
        lookupMs,
        source: resolved.source || 'local-cache',
        result: 'ADDED',
        product: resolved.product.productName,
        qty,
      });
      return true;
    }
    if (looksLikeScannedBarcode(trimmed)) {
      setSearchTerm('');
      setSearchResults([]);
      if (searchInputRef.current) searchInputRef.current.value = '';
      finishScanReport({
        ...timing,
        code: trimmed,
        lookupMs,
        source: 'barcode',
        result: 'NOT FOUND',
      });
      alert('Product not found. Scan barcode or type name to search.');
      setTimeout(() => searchInputRef.current?.focus(), 0);
      return true;
    }
    return false;
  };

  const handleInsufficientStockResolved = (freshProduct) => {
    const r = insufficientRetryRef.current;
    insufficientRetryRef.current = null;
    setInsufficientStockContext(null);
    if (!freshProduct || !r) return;
    syncProductsCache(upsertProductInList(productsCacheRef.current, freshProduct));
    if (r.type === 'ADD_CART') {
      addToCart(freshProduct, r.qty);
    } else if (r.type === 'SET_QTY') {
      const ceiling = parseProductStock(freshProduct);
      setCart(prev => prev.map(item =>
        item.productId === r.productId
          ? {
              ...item,
              quantity: parseFloat(Number(r.newQty).toFixed(3)),
              stockOnHand: ceiling,
            }
          : item
      ));
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0.001, parseFloat((Number(item.quantity) + delta).toFixed(6)));
        const ceiling = item.stockOnHand != null ? Number(item.stockOnHand) : null;
        if (wouldExceedStockDirect(ceiling, newQty)) {
          insufficientRetryRef.current = { type: 'SET_QTY', productId, newQty };
          setInsufficientStockContext({
            product: item,
            ceiling,
            requestedTotalQty: newQty,
          });
          return item;
        }
        return { ...item, quantity: parseFloat(newQty.toFixed(3)) };
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
      const ceiling = item.stockOnHand != null ? Number(item.stockOnHand) : null;
      if (wouldExceedStockDirect(ceiling, qty)) {
        insufficientRetryRef.current = { type: 'SET_QTY', productId, newQty: qty };
        setInsufficientStockContext({
          product: item,
          ceiling,
          requestedTotalQty: qty,
        });
        return item;
      }
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
      returnFocusToSearch();
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num) || num < 0) {
      setEditingQty(prev => ({ ...prev, [productId]: undefined }));
      returnFocusToSearch();
      return;
    }
    if (num === 0) {
      alert('Quantity must be greater than 0. Item removed from cart.');
      removeFromCart(productId);
      setEditingQty(prev => ({ ...prev, [productId]: undefined }));
      returnFocusToSearch();
      return;
    }
    setQuantityDirect(productId, num);
    returnFocusToSearch();
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
    const { address, phone: phoneNumber } = companyPrintContact(invoice.cashier);
    const gstNumber = invoice.cashier?.gstNumber || '';
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
          ${address ? `<div class="btoc-company-line">${formatPrintMultiline(address)}</div>` : ''}
          ${phoneNumber ? `<div class="btoc-company-line">Ph. no.: ${formatPrintMultiline(phoneNumber)}</div>` : ''}
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
            .btoc-company-line {
              font-family: inherit;
              font-size: 12px;
              font-weight: 700;
              color: #111;
              margin: 2px 0;
              line-height: 1.35;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
              word-break: break-word;
            }
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
    let printGatePass = true;
    try {
      const companyRes = await authService.getCompanyDetails();
      const company = companyRes?.data || {};
      printGatePass = company.printGatePass !== false;
      toPrint = {
        ...invoice,
        cashier: {
          ...invoice.cashier,
          companyName: invoice.cashier?.companyName || company.companyName || 'Our Spices Shop',
          address: invoice.cashier?.address || company.address || '',
          gstNumber: invoice.cashier?.gstNumber || company.gstNumber || '',
          phoneNumber: invoice.cashier?.phoneNumber || company.phoneNumber || company.customerCareNumber || '',
          customerCareNumber: invoice.cashier?.customerCareNumber || company.customerCareNumber || '',
          fssaiLicense: invoice.cashier?.fssaiLicense ?? company.fssaiLicense ?? ''
        }
      };
    } catch { /* ignore */ }
    const html = buildInvoicePrintHtml(toPrint, { twoCopies: printGatePass });
    if (!html) return;
    printHtmlViaIframe(html);
  };

  const openPaymentModal = () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
  };

  const confirmPaymentAndPreview = () => {
    if (paymentMethod === 'MIXED') {
      const total = calculateTotal();
      const sum = (Number(amounts.cash) || 0) + (Number(amounts.card) || 0) + (Number(amounts.upi) || 0);
      if (Math.abs(sum - total) > 0.05) {
        alert(`Mixed amounts (₹${sum.toFixed(2)}) must add up to the total (₹${total.toFixed(2)}).`);
        return;
      }
    }
    setShowPaymentModal(false);
    handlePreview();
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
          phoneNumber: company.phoneNumber || company.customerCareNumber || '',
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
          // String keeps exact decimals (e.g. 0.125) through JSON → BigDecimal
          quantity: String(item.quantity),
          unitPrice: item.unitPrice,
          discountAmount: 0
        }))
      };
      const response = await invoiceService.create(invoiceData);
      setLastInvoice(response.data);
      broadcastDataUpdate();
      patchActive({
        cart: [],
        paymentMethod: 'CASH',
        amounts: { cash: 0, card: 0, upi: 0 },
        discountType: 'percent',
        discountPercent: 0,
        discountAmount: 0,
        customerName: '',
      });
      setPreviewDraft(null);
      if (andPrint) {
        setShowPreview(false);
        handlePrintInvoice(response.data);
        setTimeout(() => searchInputRef.current?.focus(), 150);
      } else {
        setShowPreview(true);
      }
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
    <div
      className="billing-container"
      onMouseDown={(e) => {
        const el = e.target;
        if (!(el instanceof HTMLElement)) return;
        if (el.closest('input, select, textarea, button, label, .product-search-dropdown, .modal-overlay, .bill-preview-overlay, .payment-method-overlay, .scan-timing-panel')) return;
        returnFocusToSearch();
      }}
    >
      <div className="billing-header">
        <div className="billing-header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1>🧾 Create Invoice</h1>
          <button className="nav-link-button" onClick={() => navigate('/dashboard/bills')}>
            📚 Bills
          </button>
          <label className="scan-timing-toggle">
            <input
              type="checkbox"
              checked={showScanTiming}
              onChange={(e) => {
                const on = e.target.checked;
                setShowScanTiming(on);
                localStorage.setItem('spice_scan_timing', on ? '1' : '0');
              }}
            />
            Scan timing
          </label>
        </div>
      </div>

      {showScanTiming && (
        <div className="scan-timing-panel">
          <div className="scan-timing-panel-head">
            <strong>Scan timing on this PC</strong>
            <span>Click search box, scan 3–4 labels, then Copy if you want to send the numbers.</span>
            {scanReports.length > 0 && (
              <button
                type="button"
                className="scan-timing-copy"
                onClick={() => {
                  const text = scanReports.map((r) =>
                    `${r.at} | ${r.result} | code=${r.code} | keys=${r.keys} | gun=${r.gunMs}ms | avgGap=${r.avgGap}ms | maxGap=${r.maxGap}ms | burst=${r.burstKeys} | enterAfterLastChar=${r.enterAfterLastCharMs ?? '-'}ms | appWait=${r.enterWaitMs}ms | lookup=${r.lookupMs}ms | via=${r.source} | ${r.product}${r.qty != null ? ` qty=${r.qty}` : ''}`
                  ).join('\n');
                  navigator.clipboard?.writeText(text).catch(() => {});
                }}
              >
                Copy timings
              </button>
            )}
          </div>
          {scanReports.length === 0 ? (
            <p className="scan-timing-empty">No scans yet. Focus the search box and scan a barcode.</p>
          ) : (
            <table className="scan-timing-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Result</th>
                  <th>Code</th>
                  <th>Keys</th>
                  <th>Gun</th>
                  <th>Avg gap</th>
                  <th>Max gap</th>
                  <th>Enter after last char</th>
                  <th>App wait</th>
                  <th>Lookup</th>
                  <th>Via</th>
                  <th>Product</th>
                </tr>
              </thead>
              <tbody>
                {scanReports.map((r, i) => (
                  <tr key={`${r.at}-${i}`}>
                    <td>{r.at}</td>
                    <td>{r.result}</td>
                    <td>{r.code}</td>
                    <td>{r.keys}</td>
                    <td>{r.gunMs} ms</td>
                    <td>{r.avgGap} ms</td>
                    <td>{r.maxGap} ms</td>
                    <td>{r.enterAfterLastCharMs == null ? '—' : `${r.enterAfterLastCharMs} ms`}</td>
                    <td>{r.enterWaitMs} ms</td>
                    <td>{r.lookupMs} ms</td>
                    <td>{r.source}</td>
                    <td>{r.product}{r.qty != null ? ` × ${r.qty}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="billing-content">
        <div className="billing-main-content">
          <div className="cart-section">
          <div className="billing-cart-tabs" role="tablist" aria-label="Held carts">
            {sessions.map((session, index) => (
              <div
                key={session.id}
                className={`billing-cart-tab ${session.id === activeSession.id ? 'active' : ''}`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={session.id === activeSession.id}
                  className="billing-cart-tab-main"
                  onClick={() => switchCart(session.id)}
                >
                  <span className="billing-cart-tab-label">{cartTabLabel(session, index)}</span>
                  <span className="billing-cart-tab-count">{(session.cart || []).length}</span>
                </button>
                <button
                  type="button"
                  className="billing-cart-tab-close"
                  title="Close cart"
                  onClick={(e) => closeCart(session.id, e)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="billing-hold-btn"
              onClick={holdAndNewCart}
              title="Hold this customer and start a new cart"
            >
              <PauseCircle size={16} />
              Hold & new cart
            </button>
          </div>
          <div className="billing-cart-customer">
            <label htmlFor="billing-cart-customer-name">Customer (optional)</label>
            <input
              id="billing-cart-customer-name"
              type="text"
              value={activeSession.customerName || ''}
              onChange={(e) => patchActive({ customerName: e.target.value })}
              onBlur={() => setTimeout(returnFocusToSearch, 0)}
              placeholder="Name for this held cart"
            />
          </div>
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
              <div className="product-search-dropdown" ref={searchDropdownRef}>
                {searchResults.map((p, idx) => (
                  <div
                    key={p.productId}
                    data-search-idx={idx}
                    className={`product-search-item select-only ${idx === highlightedIndex ? 'highlighted' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => {
                      setSelectedForCart(p);
                      setSelectedQtyInput('');
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
                <label className="selected-item-qty-label">Qty / weight</label>
                <input
                  ref={selectedQtyRef}
                  type="text"
                  inputMode="decimal"
                  className="selected-item-qty-input"
                  placeholder="0"
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
                  onClick={() => { setSelectedForCart(null); setSelectedQtyInput(''); searchInputRef.current?.focus(); }}
                  aria-label="Clear"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="section-header">
            <ShoppingCart size={20} />
            <h2>{cartTabLabel(activeSession, sessions.findIndex((s) => s.id === activeSession.id))} ({cart.length} items)</h2>
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
              onClick={openPaymentModal}
            >
              {loading ? 'Loading...' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {showPaymentModal && (
      <div
        className="payment-method-overlay"
        onClick={() => setShowPaymentModal(false)}
      >
        <div className="payment-method-modal" onClick={(e) => e.stopPropagation()}>
          <h2>Select payment method</h2>
          <p className="payment-method-total">Total: ₹{calculateTotal().toFixed(2)}</p>
          <div className="payment-method-choices">
            {[
              { value: 'CASH', label: 'Cash' },
              { value: 'CARD', label: 'Card' },
              { value: 'UPI', label: 'UPI' },
              { value: 'MIXED', label: 'Mixed' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`payment-method-choice ${paymentMethod === opt.value ? 'active' : ''}`}
                onClick={() => setPaymentMethod(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {paymentMethod === 'MIXED' && (
            <div className="mixed-amounts">
              <div className="mixed-row">
                <label>Cash ₹</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amounts.cash || ''}
                  onChange={(e) => setAmounts((a) => ({ ...a, cash: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
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
                  onChange={(e) => setAmounts((a) => ({ ...a, card: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
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
                  onChange={(e) => setAmounts((a) => ({ ...a, upi: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
          )}
          <div className="payment-method-actions">
            <button type="button" className="print-btn" onClick={confirmPaymentAndPreview} disabled={loading}>
              Continue
            </button>
            <button type="button" className="btoc-btn-close" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

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
                {display.cashier?.address && (
                  <div className="btoc-company-line">{display.cashier.address}</div>
                )}
                {(display.cashier?.phoneNumber || display.cashier?.customerCareNumber) && (
                  <div className="btoc-company-line btoc-company-phone">
                    <Phone size={14} className="btoc-phone-icon" /> {display.cashier.phoneNumber || display.cashier.customerCareNumber}
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

export default Billing;
