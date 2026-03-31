import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, categoryService, productService } from '../services/api';
import { Plus, Search, Edit, Trash2, ArrowLeft, Download, Upload, Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import * as XLSX from 'xlsx';

const Inventory = () => {
  // Local FSSAI logo for barcode stickers (used in both preview and print).
  // Note: some browsers may restrict loading `file://` images in print windows.
  const fssaiLogoSrc = '/fssai-logo.png';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState(null);
  const [currentProduct, setCurrentProduct] = useState({
    productName: '',
    barcode: '',
    category: null,
    sellingPricePerUnit: 0,
    quantity: 0,
    minStockLevel: 5,
    hsnCode: '',
    packagingType: '',
    unit: '',
    usp: '',
    ingredients: '',
  });
  const [showBarcodePreview, setShowBarcodePreview] = useState(false);
  const [barcodePreviewProducts, setBarcodePreviewProducts] = useState([]);
  const [barcodeCompanyName, setBarcodeCompanyName] = useState('');
  const [barcodeCompanyAddress, setBarcodeCompanyAddress] = useState('');
  const [barcodeCustomerCare, setBarcodeCustomerCare] = useState('');
  const [barcodeCustomerCareEmail, setBarcodeCustomerCareEmail] = useState('');
  // Additional license number for printing (separate from FSSAI).
  const [barcodePackingLicense, setBarcodePackingLicense] = useState('');
  const [barcodeFssai, setBarcodeFssai] = useState('');
  const [barcodePackedDate, setBarcodePackedDate] = useState(() => {
    // YYYY-MM-DD for <input type="date">
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  });
  const [barcodeWeights, setBarcodeWeights] = useState({});
  // Per-product unit to display in "Net Quantity" (gm or ml).
  // Weight input value is always numeric; suffix is selected separately for the label.
  const [barcodeNetQtyUnitByProductId, setBarcodeNetQtyUnitByProductId] = useState({});
  const [barcodeBestBeforeMonths, setBarcodeBestBeforeMonths] = useState({});
  const [barcodeBatchNoByProductId, setBarcodeBatchNoByProductId] = useState({});
  const [barcodeManualPriceByProductId, setBarcodeManualPriceByProductId] = useState({});
  // Per-product additional marketing fields (enter in barcode preview modal).
  const [barcodeUspByProductId, setBarcodeUspByProductId] = useState({});
  const [barcodeIngredientsByProductId, setBarcodeIngredientsByProductId] = useState({});
  const barcodePreviewRef = useRef(null);
  const importInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.allSettled([
        productService.getAll(),
        categoryService.getAll()
      ]);

      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value.data)) {
        setProducts(prodRes.value.data);
      } else {
        setProducts([]);
      }

      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value.data)) {
        setCategories(catRes.value.data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      fetchData();
    } else {
      fetchData();
    }
  }, []);

  const handleSearch = (e) => setSearchTerm(e.target.value);

  const normalizeCategoryName = (name) => (name || '').toString().trim().toLowerCase();

  const parseNum = (val, fallback = 0) => {
    if (val === null || val === undefined) return fallback;
    const s = String(val).trim();
    if (!s) return fallback;
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  };

  const handleExportExcel = () => {
    try {
      const list = (filteredProducts && filteredProducts.length) ? filteredProducts : products;
      const rows = (list || []).map((p) => ({
        barcode: p?.barcode || '',
        productName: p?.productName || '',
        categoryName: p?.category?.categoryName || '',
        packagingType: p?.packagingType || '',
        unit: p?.unit || '',
        unitPrice: p?.sellingPricePerUnit ?? '',
        stock: p?.quantity ?? '',
        minimumQuantity: p?.minStockLevel ?? '',
        hsnCode: p?.hsnCode || '',
        isActive: p?.isActive ?? true,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      const safeCompany = (user?.companyName || 'company').replace(/[^\w-]+/g, '_');
      XLSX.writeFile(wb, `products_${safeCompany}.xlsx`);
    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed');
    }
  };

  const handleImportClick = () => {
    if (importing) return;
    importInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames?.[0];
      if (!sheetName) throw new Error('No sheet found in Excel');

      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!Array.isArray(raw) || raw.length === 0) {
        alert('No rows found in Excel');
        return;
      }

      const categoryByName = new Map((categories || []).map((c) => [normalizeCategoryName(c.categoryName), c]));
      const existingByBarcode = new Map(
        (products || []).filter((p) => p?.barcode).map((p) => [String(p.barcode).trim(), p])
      );
      const existingByProductCode = new Map(
        (products || []).filter((p) => p?.productCode).map((p) => [String(p.productCode).trim(), p])
      );

      let ok = 0;
      let failed = 0;
      const errors = [];

      for (const r of raw) {
        try {
          const productCode = String(r.productCode || r['Product Code'] || '').trim();
          let barcode = String(r.barcode || r.Barcode || '').trim();
          if (!barcode && productCode) barcode = productCode;

          const productName = String(r.productName || r['Product Name'] || r.name || '').trim();
          const categoryName = String(r.categoryName || r.Category || r.category || '').trim();
          const packagingType = String(r.packagingType || r.Packaging || '').trim();
          const unit = String(r.unit || r.Unit || '').trim();
          const sellingPricePerUnit = parseNum(r.unitPrice ?? r['Unit Price'] ?? r.price ?? r['UnitPrice'], 0);
          const quantity = parseNum(r.stock ?? r.quantity ?? r['Stock'] ?? 0, 0);
          const minStockLevel = parseNum(r.minimumQuantity ?? r.minStockLevel ?? r['Minimum Quantity'] ?? 0, 0);
          const hsnCode = String(r.hsnCode || r['HSN Code'] || '').trim();

          if (!productName) throw new Error('Missing productName');

          const cat = categoryByName.get(normalizeCategoryName(categoryName));
          const payload = {
            productName,
            barcode, // optional; backend auto-generates if empty
            category: cat?.categoryId ? { categoryId: cat.categoryId } : null,
            sellingPricePerUnit,
            quantity,
            minStockLevel,
            hsnCode,
            packagingType,
            unit,
            isActive: true,
          };

          const existing = (barcode && existingByBarcode.get(barcode)) || (productCode && existingByProductCode.get(productCode)) || null;
          if (existing?.productId) {
            await productService.update(existing.productId, payload);
          } else {
            await productService.create(payload);
          }

          ok += 1;
        } catch (err) {
          failed += 1;
          const msg = err?.response?.data?.message || err?.message || 'Unknown error';
          errors.push(msg);
        }
      }

      await fetchData();
      if (failed === 0) {
        alert(`Imported ${ok} product(s)`);
      } else {
        alert(
          `Imported ${ok} product(s). Failed ${failed}.\n\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? '\n...more' : ''}`
        );
      }
    } catch (err) {
      console.error('Import failed', err);
      alert(`Import failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const formatDateForLabel = (yyyyMmDd) => {
    if (!yyyyMmDd || typeof yyyyMmDd !== 'string') return '';
    const m = yyyyMmDd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return yyyyMmDd;
    const [, yyyy, mm] = m;
    // Sticker format: only month + year (no day)
    return `${mm}/${yyyy}`;
  };

  // Batch No format: B-MMYY based on "Packed On" date.
  // Example: 2026-03-25 => B-0326
  const formatBatchNoFromPackedDate = (yyyyMmDd) => {
    if (!yyyyMmDd || typeof yyyyMmDd !== 'string') return '';
    const m = yyyyMmDd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    const [, yyyy, mm] = m;
    const yy = yyyy.slice(-2);
    return `B-${mm}${yy}`;
  };

  const getBarcodeValue = (product) => {
    const base = (product?.barcode || '').toString().trim();
    const w = (barcodeWeights?.[product?.productId] || '').toString().trim();
    if (!base) return '';
    // Pieces: net quantity is for the label only; do not append weight to the barcode.
    const packagingType = (product?.packagingType || '').toString().trim().toLowerCase();
    if (packagingType === 'pieces') return base;
    return w ? `${base}${w}` : base;
  };

  const getLabelData = (product) => {
    const companyName = barcodeCompanyName || user?.companyName || product?.companyName || '';
    const companyAddress = barcodeCompanyAddress || user?.address || '';
    const customerCare = barcodeCustomerCare || user?.phoneNumber || '';
    const customerCareEmail = barcodeCustomerCareEmail || '';
    const packingLicense = barcodePackingLicense || '';
    // Remove parenthesized parts (e.g. "Elachi (Cardamom)" → "Elachi") for barcode label
    const rawName = product?.productName || '';
    const productName = rawName.replace(/\s*\([^)]*\)/g, '').trim();
    const packedDate = formatDateForLabel(barcodePackedDate);
    const fssai = barcodeFssai || '';

    const monthsRaw = barcodeBestBeforeMonths?.[product?.productId];
    const monthsParsed = monthsRaw === '' || monthsRaw == null ? NaN : parseInt(monthsRaw, 10);
    const months = Number.isNaN(monthsParsed) ? 12 : monthsParsed;
    const bestBefore = `${months} months`;

    const batchNo = (barcodeBatchNoByProductId?.[product?.productId] || '').toString().trim();

    const w = (barcodeWeights?.[product?.productId] || '').toString().trim();
    const netQtyUnit = (barcodeNetQtyUnitByProductId?.[product?.productId] || 'gm').toString().trim();
    const weight = w ? `${w}${netQtyUnit}` : '';
    const packagingType = (product?.packagingType || '').toString().trim().toLowerCase();
    const isPieces = packagingType === 'pieces';

    // When packaging is Loose (weight-based), adjust price by packed weight.
    // When packaging is Pieces, keep price the same even if weight changes.
    const basePricePerKg = product?.sellingPricePerUnit != null ? Number(product.sellingPricePerUnit) : null;
    let price = '';
    let amountExclTax = null; // numeric amount for packed quantity (without GST)
    if (basePricePerKg != null) {
      if (w) {
        const weightGm = parseFloat(w);
        const priceForWeight = isPieces || Number.isNaN(weightGm) || weightGm <= 0 ? basePricePerKg : (basePricePerKg * weightGm) / 1000;
        amountExclTax = priceForWeight;
        price = `₹${Math.round(priceForWeight * 100) / 100}`;
      } else {
        amountExclTax = basePricePerKg;
        price = `₹${basePricePerKg}`;
      }
    }

    // sellingPricePerUnit is already GST-inclusive, so "MRP (Incl of all taxes)" should
    // not add GST again. We only adjust the amount based on the packed weight (gm).
    let mrpInclTax = amountExclTax != null ? amountExclTax : null;

    // Optional manual override from barcode preview modal.
    const manualMrpRaw = (barcodeManualPriceByProductId?.[product?.productId] || '').toString().trim();
    if (manualMrpRaw) {
      const manualMrp = parseFloat(manualMrpRaw);
      if (Number.isFinite(manualMrp) && manualMrp > 0) {
        mrpInclTax = manualMrp;
      }
    }

    const unitSalePrice = mrpInclTax != null ? `₹${Math.round(mrpInclTax * 100) / 100}` : '';
    if (mrpInclTax != null) {
      price = unitSalePrice;
    }

    const usp = (barcodeUspByProductId?.[product?.productId] || '').toString().trim();
    const ingredients = (barcodeIngredientsByProductId?.[product?.productId] || '').toString().trim();

    return {
      companyName,
      companyAddress,
      customerCare,
      customerCareEmail,
      packingLicense,
      productName,
      packedDate,
      bestBefore,
      batchNo,
      fssai,
      price,
      weight,
      unitSalePrice,
      usp,
      ingredients,
    };
  };

  const openBarcodePreview = async (list) => {
    const arr = Array.isArray(list) ? list.filter(Boolean) : [];
    if (arr.length === 0) {
      alert('No products selected for barcode preview');
      return;
    }
    setBarcodePreviewProducts(arr);
    setBarcodeCompanyName(user?.companyName || arr[0]?.companyName || '');
    setBarcodeCompanyAddress('');
    setBarcodeCustomerCare('');
    setBarcodeCustomerCareEmail('');
    setBarcodePackingLicense('');
    setBarcodeWeights({});
    setBarcodeNetQtyUnitByProductId({});
    setBarcodeBestBeforeMonths({});
    setBarcodeBatchNoByProductId({});
    setBarcodeManualPriceByProductId({});
    const uspMap = {};
    const ingredientsMap = {};
    const netQtyUnitMap = {};
    arr.forEach((p) => {
      uspMap[p.productId] = (p.usp || '').toString();
      ingredientsMap[p.productId] = (p.ingredients || '').toString();
      const unitRaw = (p.unit || '').toString().trim().toLowerCase();
      const suffix = unitRaw === 'l' || unitRaw === 'ml' ? 'ml' : 'gm';
      netQtyUnitMap[p.productId] = suffix;
    });
    setBarcodeUspByProductId(uspMap);
    setBarcodeIngredientsByProductId(ingredientsMap);
    setBarcodeNetQtyUnitByProductId(netQtyUnitMap);
    setShowBarcodePreview(true);
    try {
      const res = await authService.getCompanyDetails();
      const fssai = res?.data?.fssaiLicense ?? '';
      setBarcodeFssai(fssai);
      setBarcodeCompanyAddress(res?.data?.address ?? '');
      setBarcodeCustomerCare(res?.data?.customerCareNumber ?? res?.data?.phoneNumber ?? '');
      setBarcodeCustomerCareEmail(res?.data?.customerCareEmail ?? '');
      setBarcodePackingLicense(res?.data?.packingLicenceNo ?? '');
    } catch {
      setBarcodeFssai('');
    }
  };

  const closeBarcodePreview = () => setShowBarcodePreview(false);

  const renderPreviewRows = () => {
    const rows = [];
    const list = barcodePreviewProducts || [];

    for (let idx = 0; idx < list.length; idx += 1) {
      const product = list[idx];
      const info = getLabelData(product);
      const svgId = `barcode-preview-${product.productId}-${idx}`;

      rows.push(
        <div className="label-row" key={`row-${idx}`}>
          <div className="label" key={`${product.productId}-${idx}`}>
            <div className="sticker-grid">
              <div className="sticker-col-left">
                <div className="sticker-product-name">{info.productName || '—'}</div>

                <div className="sticker-barcode-wrap">
                  <svg id={svgId} className="sticker-barcode-svg" />
                </div>

                <div className="sticker-field">
                  <span className="sticker-label">Net Quantity :</span>
                  <span className="sticker-value">{info.weight || '—'}</span>
                </div>
                <div className="sticker-field">
                  <span className="sticker-label">MRP :</span>
                  <span className="sticker-value">
                    {info.unitSalePrice || '—'} (Incl of all taxes)
                  </span>
                </div>
                <div className="sticker-field">
                  <span className="sticker-label">Packed On :</span>
                  <span className="sticker-value">{info.packedDate || '—'}</span>
                </div>
                <div className="sticker-field">
                  <span className="sticker-label">Batch No :</span>
                  <span className="sticker-value">{info.batchNo || '—'}</span>
                </div>
                <div className="sticker-field">
                  <span className="sticker-label">Best Before :</span>
                  <span className="sticker-value">{info.bestBefore || '—'}</span>
                </div>
                <div className="sticker-field">
                  <span className="sticker-label">USP :</span>
                  <span className="sticker-value">{info.usp || '—'}</span>
                </div>
              </div>

              <div className="sticker-col-right">
                {info.ingredients ? (
                  <div className="sticker-line sticker-ingredients">Ingredients: {info.ingredients}</div>
                ) : (
                  <div className="sticker-line sticker-ingredients">Ingredients: —</div>
                )}

                <div className="sticker-repacked-title">REPACKED AND MARKETED BY</div>
                <div className="sticker-company-name">{info.companyName || '—'}</div>
                <div className="sticker-company-address">{info.companyAddress || '—'}</div>

                <div className="sticker-line">Customer Care</div>
                <div className="sticker-line">Phone : {info.customerCare || '—'}</div>
                <div className="sticker-line">Email: {info.customerCareEmail || '—'}</div>
                <div className="sticker-line">LMPC Reg No: {info.packingLicense || '—'}</div>

                <div className="sticker-fssai-row">
                  <img className="fssai-logo-img" src={fssaiLogoSrc} alt="FSSAI" />
                  <div className="fssai-text">{info.fssai || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return rows;
  };

  useEffect(() => {
    if (!showBarcodePreview) return;
    const render = () => {
      for (let idx = 0; idx < barcodePreviewProducts.length; idx += 1) {
        const product = barcodePreviewProducts[idx];
        const svgEl = document.getElementById(`barcode-preview-${product.productId}-${idx}`);
        const val = getBarcodeValue(product);
        if (svgEl && val) {
          try {
            JsBarcode(svgEl, val, getBarcodeOptions());
          } catch {
            // ignore render errors for individual items
          }
        }
      }
    };

    // wait for DOM to paint
    const t = setTimeout(render, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getBarcodeValue is stable, omit to avoid extra re-runs
  }, [showBarcodePreview, barcodePreviewProducts, barcodeWeights]);

  // Auto-fill Batch No (B-MMYY) from Packed On date in barcode preview.
  // Only fills when the user has not entered a batch number yet.
  useEffect(() => {
    if (!showBarcodePreview) return;
    if (!Array.isArray(barcodePreviewProducts) || barcodePreviewProducts.length === 0) return;
    const autoBatch = formatBatchNoFromPackedDate(barcodePackedDate);
    if (!autoBatch) return;

    setBarcodeBatchNoByProductId((prev) => {
      const next = { ...(prev || {}) };
      barcodePreviewProducts.forEach((p) => {
        const cur = (next[p.productId] || '').toString().trim();
        if (!cur) next[p.productId] = autoBatch;
      });
      return next;
    });
  }, [showBarcodePreview, barcodePackedDate, barcodePreviewProducts]);

  // Auto-fill Best Before (months) with 12 if empty.
  // Only fills when the user has not entered a value yet.
  useEffect(() => {
    if (!showBarcodePreview) return;
    if (!Array.isArray(barcodePreviewProducts) || barcodePreviewProducts.length === 0) return;

    setBarcodeBestBeforeMonths((prev) => {
      const next = { ...(prev || {}) };
      barcodePreviewProducts.forEach((p) => {
        const cur = (next[p.productId] ?? '').toString().trim();
        if (!cur) next[p.productId] = 12;
      });
      return next;
    });
  }, [showBarcodePreview, barcodePreviewProducts]);

  const getBarcodeOptions = () => ({
    format: 'CODE128',
    displayValue: true,
    width: 3,
    height: 50,
    margin: 8,
    textMargin: 2,
    fontSize: 14,
    fontOptions: 'bold',
    lineColor: '#000000',
    background: '#ffffff',
  });

  /** Generate barcode as PNG data URL for TSC/thermal printers (they often render SVG as solid black). */
  const generateBarcodeImageForPrint = (barcodeText) => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, barcodeText, getBarcodeOptions());
      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  };

  const printHtmlViaIframe = (html) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument || win?.document;
    if (!win || !doc) {
      document.body.removeChild(iframe);
      alert('Failed to open print frame');
      return;
    }

    win.onafterprint = () => {
      try {
        document.body.removeChild(iframe);
      } catch { /* ignore */ }
    };

    doc.open();
    doc.write(html);
    doc.close();

    // Give the browser time to render SVG + layout
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        try {
          window.print();
        } catch { /* ignore */ }
      }
      // Safety cleanup in case onafterprint doesn't fire
      setTimeout(() => {
        try {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        } catch { /* ignore */ }
      }, 4000);
    }, 250);
  };

  const escapeForPrintHtml = (s) => {
    if (s == null || typeof s !== 'string') return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  const printBarcodesFromPreview = () => {
    const list = [...barcodePreviewProducts];
    if (list.length === 0) return;

    const isBlank = (v) => v == null || String(v).trim() === '';
    const missing = [];

    // Company-level required fields (everything except Manual MRP).
    if (isBlank(barcodeCompanyName)) missing.push('Company Name');
    if (isBlank(barcodeCompanyAddress)) missing.push('Company Address');
    if (isBlank(barcodeCustomerCare)) missing.push('Customer Care Phone');
    if (isBlank(barcodeCustomerCareEmail)) missing.push('Customer Care Email');
    if (isBlank(barcodePackingLicense)) missing.push('Packing Licence No (LMPC Reg No)');
    if (isBlank(barcodePackedDate)) missing.push('Packed Date');

    // Per-product required fields (except Manual MRP).
    list.forEach((p) => {
      const unit = (barcodeNetQtyUnitByProductId?.[p.productId] || 'gm').toString().trim();
      const qtyVal = barcodeWeights?.[p.productId] ?? '';
      const bestBeforeMonths = barcodeBestBeforeMonths?.[p.productId] ?? '';
      const batchNo = barcodeBatchNoByProductId?.[p.productId] ?? '';
      const usp = barcodeUspByProductId?.[p.productId] ?? '';
      const ingredients = barcodeIngredientsByProductId?.[p.productId] ?? '';

      if (isBlank(qtyVal)) missing.push(`Net Quantity Value (${p.productName})`);
      if (isBlank(unit)) missing.push(`Net Quantity Unit (${p.productName})`);
      if (isBlank(bestBeforeMonths)) missing.push(`Best Before Months (${p.productName})`);
      if (isBlank(batchNo)) missing.push(`Batch No (${p.productName})`);
      if (isBlank(usp)) missing.push(`USP (${p.productName})`);
      if (isBlank(ingredients)) missing.push(`Ingredients (${p.productName})`);
    });

    if (missing.length > 0) {
      alert(`Please fill required fields before printing:\n- ${missing.slice(0, 12).join('\n- ')}`);
      return;
    }

    const escapeMultilineForPrintHtml = (s) =>
      escapeForPrintHtml(s).replace(/\n/g, '<br/>');

    let j = '<div class="print-container">';
    for (let idx = 0; idx < list.length; idx += 1) {
      const product = list[idx];
      const E = getLabelData(product);
      const W = getBarcodeValue(product);
      const barcodeImg = generateBarcodeImageForPrint(W);

      const companyName = escapeForPrintHtml(E.companyName);
      const companyAddress = escapeMultilineForPrintHtml(E.companyAddress || '');
      const customerCare = escapeForPrintHtml(E.customerCare || '');
      const customerCareEmail = escapeForPrintHtml(E.customerCareEmail || '');
      const packingLicense = escapeForPrintHtml(E.packingLicense || '');
      const productName = escapeForPrintHtml(E.productName);
      const packedDate = escapeForPrintHtml(E.packedDate || '');
      const batchNo = escapeForPrintHtml(E.batchNo || '');
      const bestBefore = escapeForPrintHtml(E.bestBefore || '');
      const fssai = escapeForPrintHtml(E.fssai || '');
      const unitSalePrice = escapeForPrintHtml(E.unitSalePrice || '');
      const ingredients = escapeMultilineForPrintHtml(E.ingredients || '');
      const usp = escapeForPrintHtml(E.usp || '');
      const weight = escapeForPrintHtml(E.weight || '');

      const isLast = idx === list.length - 1;
      j += `
        <div class="label-row ${isLast ? 'last-row' : 'force-break'}">
          <div class="label">
            <div class="sticker-grid">
              <div class="sticker-col-left">
                <div class="sticker-product-name">${productName}</div>

                <div class="sticker-barcode-wrap">
                  ${barcodeImg ? `<img src="${barcodeImg}" alt="${(W || '').replace(/"/g, '&quot;')}" class="sticker-barcode-img" />` : ''}
                </div>

                <div class="sticker-field">
                  <span class="sticker-label">Net Quantity :</span>
                  <span class="sticker-value">${weight || '—'}</span>
                </div>
                <div class="sticker-field">
                  <span class="sticker-label">MRP :</span>
                  <span class="sticker-value">${unitSalePrice || '—'} (Incl of all taxes)</span>
                </div>
                <div class="sticker-field">
                  <span class="sticker-label">Packed On :</span>
                  <span class="sticker-value">${packedDate || '—'}</span>
                </div>
                <div class="sticker-field">
                  <span class="sticker-label">Batch No :</span>
                  <span class="sticker-value">${batchNo || '—'}</span>
                </div>
                <div class="sticker-field">
                  <span class="sticker-label">Best Before :</span>
                  <span class="sticker-value">${bestBefore || '—'}</span>
                </div>
                <div class="sticker-field">
                  <span class="sticker-label">USP :</span>
                  <span class="sticker-value">${usp || '—'}</span>
                </div>
              </div>

              <div class="sticker-col-right">
                ${ingredients ? `<div class="sticker-line sticker-ingredients">Ingredients: ${ingredients}</div>` : `<div class="sticker-line sticker-ingredients">Ingredients: —</div>`}

                <div class="sticker-repacked-title">REPACKED AND MARKETED BY</div>
                <div class="sticker-company-name">${companyName}</div>
                <div class="sticker-company-address">${companyAddress || '—'}</div>

                <div class="sticker-line">Customer Care</div>
                <div class="sticker-line">Phone : ${customerCare || '—'}</div>
                ${customerCareEmail ? `<div class="sticker-line">Email: ${customerCareEmail}</div>` : `<div class="sticker-line">Email: —</div>`}

                <div class="sticker-line">LMPC Reg No: ${packingLicense || '—'}</div>

                <div class="sticker-fssai-row">
                  <img class="fssai-logo-img" src="${fssaiLogoSrc}" alt="FSSAI" />
                  <div class="fssai-text">${fssai || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    j += '</div>';

    const F = j;

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcodes</title>
          <style>
            @page {
              size: 100mm 50mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              width: 100mm;
              height: 50mm;
            }
            .print-container {
              display: flex;
              flex-direction: column;
              width: 100mm;
              padding: 0;
              margin: 0;
              gap: 0;
            }
            .label-row {
              width: 100mm;
              height: 50mm;
              padding: 0;
              margin: 0;
              page-break-inside: avoid;
            }
            .force-break { page-break-after: always; }
            .last-row { page-break-after: auto; }

            .label {
              width: 100mm;
              height: 50mm;
              padding: 0;
              box-sizing: border-box;
              font-size: 6pt;
              overflow: hidden;
              color: #000;
            }

            .sticker-grid {
              position: relative;
              width: 100mm;
              height: 50mm;
              display: flex;
            }
            .sticker-grid:before {
              content: '';
              position: absolute;
              left: 50mm;
              top: 0;
              bottom: 0;
              border-left: 1px solid #000;
              pointer-events: none;
            }

            .sticker-col-left {
              width: 50mm;
              padding: 2mm 2mm 1mm 2mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              gap: 0.35mm;
              overflow: hidden;
            }
            .sticker-col-right {
              width: 50mm;
              padding: 3.5mm 1mm 1mm 1mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              gap: 0.35mm;
              overflow: hidden;
            }

            .sticker-product-name {
              font-size: 10pt;
              font-weight: 900;
              text-align: center;
              line-height: 1.1;
              word-wrap: break-word;
              overflow: hidden;
              flex-shrink: 0;
              min-height: 8mm;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .sticker-barcode-wrap {
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
            }
            .sticker-barcode-img {
              width: 46mm !important;
              height: auto !important;
              max-height: 14mm !important;
              display: block !important;
              margin: 0 auto !important;
            }
            .sticker-line {
              font-size: 7pt;
              line-height: 1.1;
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: normal;
              text-align: center;
            }
            .sticker-field {
              width: 100%;
              display: flex;
              flex-direction: row;
              align-items: flex-start;
              gap: 1mm;
            }
            .sticker-label {
              width: 24mm;
              font-size: 7pt;
              line-height: 1.1;
              font-weight: 400;
              text-align: left;
              white-space: nowrap;
            }
            .sticker-value {
              flex: 1;
              font-size: 7pt;
              line-height: 1.1;
              font-weight: 400;
              text-align: left;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .sticker-section-title {
              font-weight: 400;
              font-size: 7pt;
              margin-top: 1mm;
            }
            .sticker-usp-row {
              display: flex;
              flex-direction: row;
              align-items: flex-start;
              gap: 1mm;
            }
            .sticker-usp-title {
              font-weight: 400;
              font-size: 7pt;
              line-height: 1.1;
              white-space: nowrap;
            }
            .sticker-repacked-title {
              font-weight: 400;
              font-size: 8pt;
              text-align: center;
              margin-top: 1mm;
            }
            .sticker-company-name {
              font-weight: 900;
              font-size: 9pt;
              text-align: center;
            }
            .sticker-company-address {
              font-weight: 700;
              font-size: 7pt;
              text-align: center;
              max-height: 10mm;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
            }
            .sticker-ingredients {
              max-height: 9mm;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
            }
            .sticker-fssai {
              margin-top: 0;
              display: flex;
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
              gap: 2mm;
            }
            .sticker-fssai-row {
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: flex-start;
              gap: 1mm;
              margin-top: 0;
            }
            .fssai-logo-img {
              width: 18mm;
              height: 10mm;
              object-fit: contain;
              display: block;
              margin: 0;
              flex-shrink: 0;
            }
            .fssai-text {
              font-weight: 700;
              text-align: left;
              font-size: 7pt;
              flex: 1;
            }

            .sticker-usp-line {
              font-weight: 400;
              word-wrap: break-word;
              overflow-wrap: break-word;
              line-height: 1.15;
              max-height: 10mm;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
            }

            .label-top {
              flex-shrink: 0;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.3mm;
              margin-bottom: 1mm;
            }
            .label-repacked {
              font-size: 7pt;
              font-weight: 900;
              line-height: 1.1;
              letter-spacing: 0.01em;
            }
            .label-company-name {
              font-size: 8pt;
              font-weight: 900;
              line-height: 1.1;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .label-company-address {
              font-size: 6pt;
              font-weight: 700;
              line-height: 1.1;
              text-align: center;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .label-customer-care,
            .label-packing-licence {
              font-size: 6pt;
              font-weight: 700;
              line-height: 1.1;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }

            .label-middle {
              flex: 1;
              min-height: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              gap: 1mm;
            }
            .label-product {
              font-size: 10pt;
              font-weight: 900;
              line-height: 1.15;
              text-align: center;
              width: 100%;
              word-wrap: break-word;
              overflow-wrap: break-word;
              word-break: break-word;
              color: #000;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              padding: 0 1mm;
            }

            .label-barcode-wrap {
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              flex: 1;
              min-height: 0;
            }
            .label-barcode {
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: visible;
            }
            .label-barcode-img {
              width: 98mm !important;
              height: auto !important;
              max-height: 28mm !important;
              display: block !important;
              margin: 0 auto !important;
              image-rendering: pixelated;
              image-rendering: -moz-crisp-edges;
              image-rendering: crisp-edges;
            }

            .label-footer {
              flex-shrink: 0;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-top: 1mm;
            }
            .label-footer-left {
              display: flex;
              flex-direction: column;
              gap: 0.3mm;
              font-weight: 900;
              line-height: 1.1;
            }
            .label-footer-right {
              text-align: right;
              display: flex;
              flex-direction: column;
              gap: 0.3mm;
              font-weight: 900;
              line-height: 1.1;
              margin-right: 6mm; /* move right column slightly left for visibility */
            }
            .label-fssai {
              font-size: 6pt;
            }

            .label-extra {
              flex-shrink: 0;
              margin-top: 0.8mm;
              font-weight: 700;
              line-height: 1.1;
            }
            .label-extra-label {
              font-weight: 900;
            }
            .label-usp,
            .label-ingredients {
              font-size: 6pt;
              word-wrap: break-word;
              overflow-wrap: break-word;
              word-break: break-word;
            }
            .label-usp {
              max-height: 8mm;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }
            .label-ingredients {
              max-height: 18mm;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 4;
              -webkit-box-orient: vertical;
            }
            @media print {
              .label-barcode-img {
                width: 98mm !important;
                max-height: 28mm !important;
              }
            }
          </style>
        </head>
        <body>
          ${F}
          <script>
            (function() {
              // Close window after print
              window.onafterprint = function() {
                window.close();
              };
              function attemptPrint() {
                try {
                  if (document.body.children.length === 0) {
                    setTimeout(attemptPrint, 100);
                    return;
                  }
                  window.focus();
                  window.print();
                } catch (error) {
                  window.print();
                }
              }
              function waitForContent() {
                if (document.body && document.body.innerHTML && document.body.innerHTML.trim() !== '') {
                  setTimeout(attemptPrint, 200);
                } else {
                  setTimeout(waitForContent, 50);
                }
              }
              if (document.readyState === 'complete') waitForContent();
              else window.onload = function() { waitForContent(); };
            })();
          </script>
        </body>
      </html>
    `;

    // Try popup first (old behavior), fall back to iframe if blocked.
    try {
      const popup = window.open('', '_blank');
      if (popup && popup.document) {
        popup.document.open();
        popup.document.write(printHtml);
        popup.document.close();
        const attempt = () => {
          try {
            if (!popup || popup.closed) return;
            popup.focus();
            popup.print();
            popup.onafterprint = () => {
              try { popup.close(); } catch { /* ignore */ }
            };
          } catch {
            setTimeout(attempt, 120);
          }
        };
        setTimeout(attempt, 200);
        return;
      }
    } catch {
      // ignore and fall back
    }
    printHtmlViaIframe(printHtml);
  };

  const filteredProducts = products.filter(p => 
    (p.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode || '').includes(searchTerm)
  );

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Only send fields we actually use in UI.
      // GST% will be derived from Category in backend (if not explicitly provided).
      // ProductCode is not used in UI (backend will auto-fill).
      const dataToSave = {
        productName: currentProduct.productName,
        barcode: (currentProduct.barcode || '').trim(),
        category: currentProduct.category?.categoryId ? { categoryId: currentProduct.category.categoryId } : null,
        sellingPricePerUnit: currentProduct.sellingPricePerUnit,
        quantity: currentProduct.quantity,
        minStockLevel: currentProduct.minStockLevel,
        hsnCode: currentProduct.hsnCode,
        packagingType: currentProduct.packagingType,
        unit: (currentProduct.unit ?? '').trim(),
        usp: (currentProduct.usp ?? '').trim(),
        ingredients: (currentProduct.ingredients ?? '').trim(),
        isActive: true
      };

      if (currentProduct.productId) {
        await productService.update(currentProduct.productId, dataToSave);
      } else {
        await productService.create(dataToSave);
      }
      setShowModal(false);
      fetchData();
    } catch {
      alert('Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.delete(id);
        fetchData();
      } catch {
        alert('Failed to delete product');
      }
    }
  };

  if (!user) return <div className="loading">Loading session...</div>;

  const isAdmin = user.role === 'ADMIN';
  const containerClass = isAdmin ? "products-container" : "cashier-products-container";
  const headerClass = isAdmin ? "products-header" : "cashier-products-header";
  const contentClass = isAdmin ? "products-content" : "cashier-products-content";

  return (
    <div className={containerClass}>
      <style>
        {`
          /* Hide number input spinners (up/down arrows) across this page */
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}
      </style>
      <div className={headerClass}>
        <div>
          <h1>📦 Product Management</h1>
          <p>{isAdmin ? 'Manage your spices and stock levels' : 'Check product inventory'}</p>
        </div>
        <div className="header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
          <button className="add-button" onClick={() => {
            setCurrentProduct({
              productName: '',
              barcode: '',
              category: null,
              sellingPricePerUnit: 0,
              quantity: 0,
              minStockLevel: 5,
              hsnCode: '',
              packagingType: '',
              unit: '',
              usp: '',
              ingredients: '',
            });
            setShowModal(true);
          }}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      <div className={contentClass}>
        <div className="products-toolbar">
          <div className="search-bar">
            <input 
              type="text" 
              className="search-input"
              placeholder="Search by name, barcode or code..." 
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="toolbar-actions">
            <button
              className="category-button"
              type="button"
              onClick={() => navigate('/dashboard/categories')}
            >
              Categories
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFile}
              style={{ display: 'none' }}
            />
            <button className="export-button" type="button" onClick={handleExportExcel}>
              <Download size={18} /> Export Excel
            </button>
            <button className="export-button" type="button" onClick={handleImportClick} disabled={importing}>
              <Upload size={18} /> {importing ? 'Importing...' : 'Import Excel'}
            </button>
          </div>
        </div>

        <div className="products-table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>Barcode</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Packaging</th>
                <th>Unit</th>
                <th>Stock</th>
                <th>Unit Price</th>
                <th>GST %</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="loading">Loading products...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan="9" className="no-data">No products found</td></tr>
              ) : filteredProducts.map(product => (
                <tr
                  key={product.productId}
                  className={parseFloat(product.quantity || 0) <= parseFloat(product.minStockLevel || 0) ? 'stock-low' : ''}
                >
                  <td>{product.barcode}</td>
                  <td>{product.productName}</td>
                  <td>{product.category?.categoryName || 'No Category'}</td>
                  <td>{product.packagingType || '-'}</td>
                  <td>{product.unit || '-'}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        parseFloat(product.quantity || 0) <= parseFloat(product.minStockLevel || 0) ? 'low-stock' : 'stock-ok'
                      }`}
                    >
                      {product.quantity}
                    </span>
                  </td>
                  <td>₹{product.sellingPricePerUnit}</td>
                  <td>{product.category?.gstPercentage != null ? `${product.category.gstPercentage}%` : '-'}</td>
                  <td className="action-buttons">
                    <button
                      className="edit-btn"
                      title="Print barcode"
                      onClick={() => openBarcodePreview([product])}
                      type="button"
                    >
                      <Printer size={16} />
                    </button>
                    <button className="edit-btn" onClick={() => {
                      setCurrentProduct({
                        ...product,
                        sellingPricePerUnit: product.sellingPricePerUnit ?? 0,
                        quantity: product.quantity ?? 0,
                        minStockLevel: product.minStockLevel ?? 0,
                        packagingType: product.packagingType ?? '',
                        unit: product.unit ?? '',
                        hsnCode: product.hsnCode ?? '',
                        category: product.category ?? null
                      });
                      setShowModal(true);
                    }}>
                      <Edit size={16} />
                    </button>
                    <button className="remove-btn" onClick={() => handleDelete(product.productId)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{currentProduct.productId ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave} className="product-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Product Name</label>
                  <input 
                    type="text" 
                    value={currentProduct.productName} 
                    onChange={e => setCurrentProduct({...currentProduct, productName: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select 
                    value={currentProduct.category?.categoryId || ''} 
                    onChange={e => setCurrentProduct({
                      ...currentProduct, 
                      category: categories.find(c => c.categoryId === parseInt(e.target.value, 10)) || null
                    })}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                {currentProduct.productId ? (
                  <div className="form-group">
                    <label>Barcode</label>
                    <input
                      type="text"
                      value={currentProduct.barcode || ''}
                      readOnly
                    />
                  </div>
                ) : null}
                <div className="form-group">
                  <label>HSN Code</label>
                  <input 
                    type="text" 
                    value={currentProduct.hsnCode} 
                    onChange={e => setCurrentProduct({...currentProduct, hsnCode: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>USP</label>
                  <input
                    type="text"
                    value={currentProduct.usp || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, usp: e.target.value })}
                    placeholder="e.g., Freshly packed"
                    maxLength={200}
                  />
                </div>
                <div className="form-group">
                  <label>Ingredients</label>
                  <textarea
                    value={currentProduct.ingredients || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, ingredients: e.target.value })}
                    placeholder="e.g., Elachi, Sugar, Salt"
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unit Price (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={currentProduct.sellingPricePerUnit} 
                    onChange={e => setCurrentProduct({...currentProduct, sellingPricePerUnit: parseFloat(e.target.value)})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input 
                    type="number" 
                    value={currentProduct.quantity} 
                    onChange={e => setCurrentProduct({...currentProduct, quantity: parseFloat(e.target.value)})}
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Packaging Type</label>
                  <select
                    value={currentProduct.packagingType || ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, packagingType: e.target.value })}
                  >
                    <option value="">Select</option>
                    <option value="Loose">Loose</option>
                    <option value="Pieces">Pieces</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <select
                    value={currentProduct.unit ?? ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, unit: e.target.value })}
                  >
                    <option value="">Select</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="pcs">Pieces (pcs)</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Minimum Quantity</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={currentProduct.minStockLevel}
                    onChange={e => setCurrentProduct({...currentProduct, minStockLevel: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div className="form-group" />
              </div>
              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBarcodePreview && (
        <div className="barcode-preview-overlay" onClick={closeBarcodePreview}>
          <div className="barcode-preview-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="barcode-preview-header">
              <h2>🖨️ Barcode Preview</h2>
              <button className="close-button" onClick={closeBarcodePreview} type="button">×</button>
            </div>

            <style>
              {`
                .preview-container {
                  display: flex;
                  flex-direction: column;
                  gap: 6mm;
                  transform: scale(0.72);
                  transform-origin: top left;
                }
                .label-row {
                  width: 100mm;
                  height: 50mm;
                }
                .label {
                  width: 100mm;
                  height: 50mm;
                  padding: 0;
                  box-sizing: border-box;
                  font-family: Arial, sans-serif;
                  font-size: 6pt;
                  color: #000;
                  overflow: hidden;
                }
                .sticker-grid {
                  position: relative;
                  width: 100mm;
                  height: 50mm;
                  display: flex;
                }
                .sticker-grid:before {
                  content: '';
                  position: absolute;
                  left: 50mm;
                  top: 0;
                  bottom: 0;
                  border-left: 1px solid #000;
                  pointer-events: none;
                }
                .sticker-col-left {
                  width: 50mm;
                  padding: 2mm 2mm 1mm 2mm;
                  box-sizing: border-box;
                  display: flex;
                  flex-direction: column;
                  gap: 0.35mm;
                }
                .sticker-col-right {
                  width: 50mm;
                  padding: 3.5mm 1mm 1mm 1mm;
                  box-sizing: border-box;
                  display: flex;
                  flex-direction: column;
                  gap: 0.35mm;
                }
                .sticker-product-name {
                  font-size: 10pt;
                  font-weight: 900;
                  text-align: center;
                  line-height: 1.1;
                  word-wrap: break-word;
                  overflow: hidden;
                  flex-shrink: 0;
                  min-height: 8mm;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .sticker-barcode-wrap {
                  flex-shrink: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .sticker-barcode-svg {
                  width: 46mm !important;
                  height: auto !important;
                  display: block;
                  margin: 0 auto;
                }
                .sticker-line {
                  font-size: 7pt;
                  line-height: 1.1;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                  white-space: normal;
                  text-align: center;
                }
                .sticker-field {
                  width: 100%;
                  display: flex;
                  flex-direction: row;
                  align-items: flex-start;
                  gap: 1mm;
                }
                .sticker-label {
                  width: 24mm;
                  font-size: 7pt;
                  line-height: 1.1;
                  font-weight: 400;
                  text-align: left;
                  white-space: nowrap;
                }
                .sticker-value {
                  flex: 1;
                  font-size: 7pt;
                  line-height: 1.1;
                  font-weight: 400;
                  text-align: left;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                }
                .sticker-section-title {
                  font-weight: 400;
                  font-size: 7pt;
                  margin-top: 1mm;
                }
                .sticker-usp-row {
                  display: flex;
                  flex-direction: row;
                  align-items: flex-start;
                  gap: 1mm;
                }
                .sticker-usp-title {
                  font-weight: 400;
                  font-size: 7pt;
                  line-height: 1.1;
                  white-space: nowrap;
                }
                .sticker-repacked-title {
                  font-weight: 400;
                  font-size: 8pt;
                  text-align: center;
                  margin-top: 1mm;
                }
                .sticker-company-name {
                  font-weight: 900;
                  font-size: 9pt;
                  text-align: center;
                }
                .sticker-company-address {
                  font-weight: 700;
                  font-size: 7pt;
                  text-align: center;
                  max-height: 10mm;
                  overflow: hidden;
                  display: -webkit-box;
                  -webkit-line-clamp: 3;
                  -webkit-box-orient: vertical;
                }
                .sticker-ingredients {
                  max-height: 9mm;
                  overflow: hidden;
                  display: -webkit-box;
                  -webkit-line-clamp: 3;
                  -webkit-box-orient: vertical;
                }
                .sticker-fssai-row {
                  margin-top: 0;
                  display: flex;
                  align-items: center;
                  justify-content: flex-start;
                  gap: 1mm;
                }
                .fssai-logo-img {
                  width: 18mm;
                  height: 10mm;
                  object-fit: contain;
                  display: block;
                  margin: 0;
                  flex-shrink: 0;
                }
                .fssai-text {
                  font-weight: 700;
                  text-align: left;
                  font-size: 7pt;
                  line-height: 1.1;
                  flex: 1;
                }
                .sticker-usp-line {
                  font-weight: 400;
                  font-size: 6pt;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                }
              `}
            </style>

            <div className="barcode-preview-content">
              <p className="preview-info">
                Preview of {barcodePreviewProducts.length} barcode sticker(s) - 100mm × 50mm (1 per page)
              </p>

              <div className="company-details-section">
                <h3>Company Details:</h3>
                <div className="company-inputs-row">
                  <div className="input-field-group">
                    <label>Company Name:</label>
                    <input
                      type="text"
                      placeholder="Enter company name"
                      value={barcodeCompanyName}
                      onChange={(e) => setBarcodeCompanyName(e.target.value)}
                      className="company-name-input"
                      maxLength={50}
                    />
                  </div>
                    <div className="input-field-group">
                      <label>Company Address:</label>
                      <input
                        type="text"
                        placeholder="Enter company address"
                        value={barcodeCompanyAddress}
                        onChange={(e) => setBarcodeCompanyAddress(e.target.value)}
                        className="company-address-input"
                        maxLength={120}
                      />
                    </div>
                    <div className="input-field-group">
                      <label>Customer Care:</label>
                      <input
                        type="text"
                        placeholder="e.g., 9876543210"
                        value={barcodeCustomerCare}
                        onChange={(e) => setBarcodeCustomerCare(e.target.value)}
                        className="customer-care-input"
                        maxLength={30}
                      />
                    </div>
                  <div className="input-field-group">
                    <label>FSSAI License:</label>
                    <input
                      type="text"
                      placeholder="Enter FSSAI license"
                      value={barcodeFssai}
                      onChange={(e) => setBarcodeFssai(e.target.value)}
                      className="fssai-input"
                      maxLength={30}
                    />
                  </div>
                    <div className="input-field-group">
                      <label>Packing Licence No:</label>
                      <input
                        type="text"
                        placeholder="Enter packing licence number"
                        value={barcodePackingLicense}
                        onChange={(e) => setBarcodePackingLicense(e.target.value)}
                        className="packing-licence-input"
                        maxLength={30}
                      />
                    </div>
                  <div className="input-field-group">
                    <label>Packed Date:</label>
                    <input
                      type="date"
                      value={barcodePackedDate}
                      onChange={(e) => setBarcodePackedDate(e.target.value)}
                      className="packed-date-input"
                    />
                  </div>
                </div>
              </div>

              <div className="weight-inputs-section">
                <h3>Product Details - Optional:</h3>
                <div className="product-inputs-grid">
                  {barcodePreviewProducts.map((p) => (
                    <div className="product-input-item" key={p.productId}>
                      <div className="product-input-header">
                        <strong>{p.productName}</strong> ({p.barcode})
                      </div>
                      <div className="product-input-fields">
                        <div className="input-field-group">
                          <label>Net Quantity Value:</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="e.g., 250"
                            value={barcodeWeights[p.productId] || ''}
                            onChange={(e) => setBarcodeWeights({ ...barcodeWeights, [p.productId]: e.target.value })}
                            className="weight-input"
                          />
                          <span className="input-unit">{barcodeNetQtyUnitByProductId[p.productId] || 'gm'}</span>
                        </div>
                        <div className="input-field-group">
                          <label>Net Quantity Unit:</label>
                          <select
                            value={barcodeNetQtyUnitByProductId[p.productId] || 'gm'}
                            onChange={(e) =>
                              setBarcodeNetQtyUnitByProductId({
                                ...barcodeNetQtyUnitByProductId,
                                [p.productId]: e.target.value,
                              })
                            }
                            className="net-qty-unit-select"
                          >
                            <option value="gm">gm</option>
                            <option value="ml">ml</option>
                          </select>
                        </div>
                        <div className="input-field-group">
                          <label>Manual MRP (Incl of all taxes):</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g., 7200"
                            value={barcodeManualPriceByProductId[p.productId] || ''}
                            onChange={(e) =>
                              setBarcodeManualPriceByProductId({
                                ...barcodeManualPriceByProductId,
                                [p.productId]: e.target.value,
                              })
                            }
                            className="manual-mrp-input"
                          />
                        </div>
                        <div className="input-field-group">
                          <label>Best Before (months):</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="e.g., 12"
                            value={barcodeBestBeforeMonths[p.productId] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                setBarcodeBestBeforeMonths({ ...barcodeBestBeforeMonths, [p.productId]: '' });
                                return;
                              }
                              const parsed = parseInt(val, 10);
                              setBarcodeBestBeforeMonths({ ...barcodeBestBeforeMonths, [p.productId]: Number.isNaN(parsed) ? '' : parsed });
                            }}
                            className="months-input"
                          />
                          <span className="input-unit">months</span>
                        </div>
                        <div className="input-field-group">
                          <label>Batch No:</label>
                          <input
                            type="text"
                            placeholder="e.g., B123"
                            value={barcodeBatchNoByProductId[p.productId] || ''}
                            onChange={(e) =>
                              setBarcodeBatchNoByProductId({
                                ...barcodeBatchNoByProductId,
                                [p.productId]: e.target.value,
                              })
                            }
                            className="batch-no-input"
                            maxLength={30}
                          />
                        </div>
                        <div className="input-field-group">
                          <label>USP:</label>
                          <input
                            type="text"
                            placeholder="e.g., Freshly packed"
                            value={barcodeUspByProductId[p.productId] || ''}
                            onChange={(e) => setBarcodeUspByProductId({ ...barcodeUspByProductId, [p.productId]: e.target.value })}
                            className="usp-input"
                            maxLength={80}
                          />
                        </div>
                        <div className="input-field-group">
                          <label>Ingredients:</label>
                          <textarea
                            placeholder="e.g., Elachi, Sugar, Salt"
                            value={barcodeIngredientsByProductId[p.productId] || ''}
                            onChange={(e) =>
                              setBarcodeIngredientsByProductId({ ...barcodeIngredientsByProductId, [p.productId]: e.target.value })
                            }
                            className="ingredients-input"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="weight-info">
                  💡 <strong>Net Quantity Value:</strong> For weight/volume-based products, enter value (e.g., 250) and choose unit gm or ml - it will be appended to barcode (
                  {(barcodePreviewProducts[0]?.barcode) || '1000A'} + 250 = {(barcodePreviewProducts[0]?.barcode) || '1000A'}250). Leave blank for pieces/cups.
                  <br />
                  💡 <strong>Best Before:</strong> Enter number of months (e.g., 12, 24, 36). Default is 12 months. Will display as &quot;12 months&quot; on the barcode.
                  <br />
                  💡 <strong>USP / Ingredients:</strong> Enter these per product for the sticker.
                </p>
              </div>

              <div className="preview-container" ref={barcodePreviewRef}>
                {renderPreviewRows()}
              </div>
            </div>

            <div className="barcode-preview-footer">
              <button onClick={closeBarcodePreview} className="cancel-button" type="button">Cancel</button>
              <button onClick={printBarcodesFromPreview} className="print-button" type="button">🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
