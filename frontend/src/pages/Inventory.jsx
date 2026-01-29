import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryService, productService } from '../services/api';
import { Plus, Search, Edit, Trash2, ArrowLeft, Download, Upload, Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import * as XLSX from 'xlsx';

const Inventory = () => {
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
  });
  const [showBarcodePreview, setShowBarcodePreview] = useState(false);
  const [barcodePreviewProducts, setBarcodePreviewProducts] = useState([]);
  const [barcodeCompanyName, setBarcodeCompanyName] = useState('');
  const [barcodeFssai, setBarcodeFssai] = useState('');
  const [barcodePackedDate, setBarcodePackedDate] = useState(() => {
    // YYYY-MM-DD for <input type="date">
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  });
  const [barcodeWeights, setBarcodeWeights] = useState({});
  const [barcodeBestBeforeMonths, setBarcodeBestBeforeMonths] = useState({});
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
    const [, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`;
  };

  const getBarcodeValue = (product) => {
    const base = (product?.barcode || '').toString().trim();
    const w = (barcodeWeights?.[product?.productId] || '').toString().trim();
    if (!base) return '';
    return w ? `${base}${w}` : base;
  };

  const getLabelData = (product) => {
    const companyName = barcodeCompanyName || user?.companyName || product?.companyName || '';
    const productName = product?.productName || '';
    const packedDate = formatDateForLabel(barcodePackedDate);
    const fssai = barcodeFssai || '';

    const monthsRaw = barcodeBestBeforeMonths?.[product?.productId];
    const monthsParsed = monthsRaw === '' || monthsRaw == null ? NaN : parseInt(monthsRaw, 10);
    const months = Number.isNaN(monthsParsed) ? 12 : monthsParsed;
    const bestBefore = `${months} months`;

    const price = product?.sellingPricePerUnit != null ? `₹${product.sellingPricePerUnit}` : '';
    const w = (barcodeWeights?.[product?.productId] || '').toString().trim();
    const weight = w ? `${w}gm` : '';

    return { companyName, productName, packedDate, bestBefore, fssai, price, weight };
  };

  const openBarcodePreview = (list) => {
    const arr = Array.isArray(list) ? list.filter(Boolean) : [];
    if (arr.length === 0) {
      alert('No products selected for barcode preview');
      return;
    }
    setBarcodePreviewProducts(arr);
    setBarcodeCompanyName(user?.companyName || arr[0]?.companyName || '');
    setBarcodeFssai('');
    setBarcodeWeights({});
    setBarcodeBestBeforeMonths({});
    setShowBarcodePreview(true);
  };

  const closeBarcodePreview = () => setShowBarcodePreview(false);

  const renderPreviewRows = () => {
    const rows = [];
    const k = [...barcodePreviewProducts];
    if (k.length % 2 !== 0 && k.length > 0) k.push(k[k.length - 1]);

    for (let j = 0; j < k.length; j += 2) {
      const pair = k.slice(j, j + 2);
      rows.push(
        <div className="label-row" key={`row-${j}`}>
          <div className="label-spacer-left" />
          {pair[0] ? (() => {
            const info = getLabelData(pair[0]);
            const svgId = `barcode-preview-${pair[0].productId}-${j}`;
            return (
              <div className="label" key={`${pair[0].productId}-${j}`}>
                <div className="label-top">
                  <div className="label-header">{info.companyName}</div>
                  <div className="label-product">{info.productName}</div>
                </div>
                <div className="label-barcode" style={{ marginTop: '-4px' }}>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <svg id={svgId} style={{ display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto' }} />
                  </div>
                </div>
                <div className="label-footer">
                  <div className="label-footer-left">
                    <div>Pkd: {info.packedDate}</div>
                    <div>BB: {info.bestBefore}</div>
                    <div className="label-fssai">FSSAI: {info.fssai}</div>
                  </div>
                  <div className="label-footer-right">
                    <div>{info.price}</div>
                    {info.weight ? <div>{info.weight}</div> : null}
                  </div>
                </div>
              </div>
            );
          })() : null}
          <div className="label-spacer-middle" />
          {pair[1] ? (() => {
            const info = getLabelData(pair[1]);
            const svgId = `barcode-preview-${pair[1].productId}-${j + 1}`;
            return (
              <div className="label" key={`${pair[1].productId}-${j + 1}`}>
                <div className="label-top">
                  <div className="label-header">{info.companyName}</div>
                  <div className="label-product">{info.productName}</div>
                </div>
                <div className="label-barcode" style={{ marginTop: '-4px' }}>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <svg id={svgId} style={{ display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto' }} />
                  </div>
                </div>
                <div className="label-footer">
                  <div className="label-footer-left">
                    <div>Pkd: {info.packedDate}</div>
                    <div>BB: {info.bestBefore}</div>
                    <div className="label-fssai">FSSAI: {info.fssai}</div>
                  </div>
                  <div className="label-footer-right">
                    <div>{info.price}</div>
                    {info.weight ? <div>{info.weight}</div> : null}
                  </div>
                </div>
              </div>
            );
          })() : null}
          <div className="label-spacer-right" />
        </div>
      );
    }
    return rows;
  };

  useEffect(() => {
    if (!showBarcodePreview) return;
    const k = [...barcodePreviewProducts];
    if (k.length % 2 !== 0 && k.length > 0) k.push(k[k.length - 1]);

    const render = () => {
      for (let j = 0; j < k.length; j += 2) {
        const pair = k.slice(j, j + 2);
        if (pair[0]) {
          const svgEl = document.getElementById(`barcode-preview-${pair[0].productId}-${j}`);
          const val = getBarcodeValue(pair[0]);
          if (svgEl && val) {
            try {
              JsBarcode(svgEl, val, {
                format: 'CODE128',
                displayValue: true,
                height: 18,
                margin: 0,
                textMargin: 2,
                fontSize: 10,
                fontOptions: 'bold',
              });
            } catch (e) {
              // ignore render errors for individual items
            }
          }
        }
        if (pair[1]) {
          const svgEl = document.getElementById(`barcode-preview-${pair[1].productId}-${j + 1}`);
          const val = getBarcodeValue(pair[1]);
          if (svgEl && val) {
            try {
              JsBarcode(svgEl, val, {
                format: 'CODE128',
                displayValue: true,
                height: 22,
                margin: 0,
                textMargin: 2,
                fontSize: 10,
                fontOptions: 'bold',
              });
            } catch (e) {
              // ignore render errors for individual items
            }
          }
        }
      }
    };

    // wait for DOM to paint
    const t = setTimeout(render, 0);
    return () => clearTimeout(t);
  }, [showBarcodePreview, barcodePreviewProducts, barcodeWeights, barcodeBestBeforeMonths, barcodeCompanyName, barcodeFssai, barcodePackedDate]);

  const generateBarcodeSvgInner = (barcodeText) => {
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(svg, barcodeText, {
        format: 'CODE128',
        displayValue: true,
        height: 18,
        margin: 0,
        textMargin: 2,
        fontSize: 10,
        fontOptions: 'bold',
      });
      if (!svg.getAttribute('viewBox')) {
        const w = svg.getAttribute('width') || '100';
        const h = svg.getAttribute('height') || '30';
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
      return svg.innerHTML;
    } catch (e) {
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
      } catch (e) {}
    };

    doc.open();
    doc.write(html);
    doc.close();

    // Give the browser time to render SVG + layout
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch (e) {
        try {
          window.print();
        } catch (e2) {}
      }
      // Safety cleanup in case onafterprint doesn't fire
      setTimeout(() => {
        try {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        } catch (e) {}
      }, 4000);
    }, 250);
  };

  const printBarcodesFromPreview = () => {
    const list = [...barcodePreviewProducts];
    if (list.length === 0) return;

    const k = [...list];
    if (k.length % 2 !== 0 && k.length > 0) k.push(k[k.length - 1]);

    let j = '<div class="print-container">';
    for (let I = 0; I < k.length; I += 2) {
      const P = k.slice(I, I + 2);
      j += '<div class="label-row">';
      j += '<div class="label-spacer-left"></div>';

      if (P[0]) {
        const E = getLabelData(P[0]);
        const W = getBarcodeValue(P[0]);
        const q = generateBarcodeSvgInner(W);
        j += `
          <div class="label">
            <div class="label-top">
              <div class="label-header">${E.companyName}</div>
              <div class="label-product">${E.productName}</div>
            </div>
            <div class="label-barcode">
              <div style="width: 100%; display: flex; justify-content: center; align-items: center; text-align: center; height: 100%;">
                <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="display: block; max-width: 100%; height: auto; margin: 0 auto !important; vertical-align: middle; text-align: center;">${q}</svg>
              </div>
            </div>
            <div class="label-footer">
              <div class="label-footer-left">
                <div>Pkd: ${E.packedDate}</div>
                <div>BB: ${E.bestBefore}</div>
                <div class="label-fssai">FSSAI: ${E.fssai}</div>
              </div>
              <div class="label-footer-right">
                <div>${E.price}</div>
                ${E.weight ? `<div>${E.weight}</div>` : ''}
              </div>
            </div>
          </div>
        `;
      }

      j += '<div class="label-spacer-middle"></div>';

      if (P[1]) {
        const E = getLabelData(P[1]);
        const W = getBarcodeValue(P[1]);
        const q = generateBarcodeSvgInner(W);
        j += `
          <div class="label">
            <div class="label-top">
              <div class="label-header">${E.companyName}</div>
              <div class="label-product">${E.productName}</div>
            </div>
            <div class="label-barcode">
              <div style="width: 100%; display: flex; justify-content: center; align-items: center; text-align: center; height: 100%;">
                <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="display: block; max-width: 100%; height: auto; margin: 0 auto !important; vertical-align: middle; text-align: center;">${q}</svg>
              </div>
            </div>
            <div class="label-footer">
              <div class="label-footer-left">
                <div>Pkd: ${E.packedDate}</div>
                <div>BB: ${E.bestBefore}</div>
                <div class="label-fssai">FSSAI: ${E.fssai}</div>
              </div>
              <div class="label-footer-right">
                <div>${E.price}</div>
                ${E.weight ? `<div>${E.weight}</div>` : ''}
              </div>
            </div>
          </div>
        `;
      }

      j += '<div class="label-spacer-right"></div>';
      j += '</div>';
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
              size: 111mm 25mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              width: 111mm;
              height: 25mm;
            }
            .print-container {
              display: flex;
              flex-direction: column;
              width: 111mm;
              padding: 0;
              margin: 0;
              gap: 0;
            }
            .label-row {
              display: flex;
              flex-direction: row;
              width: 111mm;
              height: 25mm;
              padding: 0;
              margin: 0;
              gap: 0;
              page-break-after: always;
            }
            .label-spacer-left {
              width: 3mm;
              height: 25mm;
              flex-shrink: 0;
            }
            .label-spacer-middle {
              width: 5mm;
              height: 25mm;
              flex-shrink: 0;
            }
            .label-spacer-right {
              width: 3mm;
              height: 25mm;
              flex-shrink: 0;
            }
            .label {
              width: 50mm;
              height: 25mm;
              padding: 1mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              font-size: 5pt;
              page-break-inside: avoid;
              overflow: hidden;
              flex-shrink: 0;
            }
            .label-top {
              display: flex;
              flex-direction: column;
              gap: 0.3mm;
              margin-bottom: 0.5mm;
              align-items: center;
              text-align: center;
            }
            .label-header {
              font-size: 6pt;
              font-weight: 900;
              line-height: 1.1;
              text-align: center;
              width: 100%;
              word-wrap: break-word;
              overflow-wrap: break-word;
              color: #000;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .label-product {
              font-size: 6.5pt;
              font-weight: 900;
              line-height: 1.1;
              text-align: center;
              width: 100%;
              word-wrap: break-word;
              overflow-wrap: break-word;
              color: #000;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .label-fssai {
              font-size: 5.5pt;
              color: #000;
              line-height: 1.2;
              word-wrap: break-word;
              overflow-wrap: break-word;
              font-weight: 900;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .label-barcode {
              margin: 0mm 0 0mm 0;
              text-align: center;
              height: 9mm;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: visible;
              width: 100%;
              vertical-align: middle;
              transform: translateY(-0.6mm);
            }
            .label-barcode > div {
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              text-align: center;
              height: 100%;
            }
            .label-barcode svg {
              max-width: 100%;
              max-height: 9mm;
              height: auto;
              display: block;
              margin: 0 auto !important;
              vertical-align: middle;
              text-align: center;
            }
            .label-barcode svg * {
              text-anchor: middle;
            }
            .label-barcode canvas {
              display: none;
            }
            .label-barcode text,
            .label-barcode svg text {
              font-weight: 900 !important;
              font-family: Arial, sans-serif !important;
              font-size: 10pt !important;
              fill: #000000 !important;
              stroke: #000000 !important;
              stroke-width: 0.2 !important;
              paint-order: stroke fill !important;
              text-anchor: middle !important;
              text-align: center !important;
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
            }
            .label-footer {
              display: flex;
              justify-content: space-between;
              font-size: 5.5pt;
              margin-top: 0.2mm;
              line-height: 1.2;
              font-weight: 900;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .label-footer-left {
              display: flex;
              flex-direction: column;
              gap: 0.2mm;
              color: #000;
              font-weight: 900;
            }
            .label-footer-right {
              text-align: right;
              display: flex;
              flex-direction: column;
              gap: 0.2mm;
              color: #000;
              font-weight: 900;
            }
            @media print {
              .no-print {
                display: none;
              }
              .label-barcode {
                text-align: center !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              .label-barcode > div {
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                text-align: center !important;
                width: 100% !important;
              }
              .label-barcode svg {
                margin: 0 auto !important;
                display: block !important;
                text-align: center !important;
              }
              .label-barcode text,
              .label-barcode svg text {
                text-anchor: middle !important;
                text-align: center !important;
              }
            }
          </style>
        </head>
        <body>
          ${F}
          <script>
            (function() {
              // Store printer preference for barcodes
              localStorage.setItem('lastUsedPrinter', 'TSC');
              localStorage.setItem('barcodePrinter', 'TSC');
              
              function attemptPrint() {
                try {
                  // Ensure content is fully loaded
                  if (document.body.children.length === 0) {
                    console.warn('Print content not loaded, retrying...');
                    setTimeout(attemptPrint, 100);
                    return;
                  }
                  
                  window.focus();
                  // Try to use Print API with printer selection
                  // Note: Browser may require user to select printer manually
                  // The browser will remember the last selected printer
                  window.print();
                } catch (error) {
                  console.error('Print error:', error);
                  window.print();
                }
              }
              
              // Close window after print
              window.onafterprint = function() {
                window.close();
              };
              
              // Wait for content to be fully rendered before printing
              function waitForContent() {
                if (document.body && document.body.innerHTML && document.body.innerHTML.trim() !== '') {
                  // Additional delay to ensure SVG is rendered
                  setTimeout(attemptPrint, 200);
                } else {
                  setTimeout(waitForContent, 50);
                }
              }
              
              // Trigger print when ready
              if (document.readyState === 'complete') {
                waitForContent();
              } else {
                window.onload = function() {
                  waitForContent();
                };
              }
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
        // Some browsers block auto-print inside the popup script.
        // Force print from the opener after content is ready.
        const attempt = () => {
          try {
            if (!popup || popup.closed) return;
            const ready = popup.document?.readyState === 'complete';
            const hasBody = !!popup.document?.body;
            const hasHtml = (popup.document?.body?.innerHTML || '').trim().length > 0;
            if (!ready || !hasBody || !hasHtml) {
              setTimeout(attempt, 60);
              return;
            }
            popup.focus();
            popup.print();
            popup.onafterprint = () => {
              try { popup.close(); } catch (e) {}
            };
          } catch (e) {
            setTimeout(attempt, 120);
          }
        };
        setTimeout(attempt, 200);
        return;
      }
    } catch (e) {
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
        isActive: true
      };

      if (currentProduct.productId) {
        await productService.update(currentProduct.productId, dataToSave);
      } else {
        await productService.create(dataToSave);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.delete(id);
        fetchData();
      } catch (err) {
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

            <div className="barcode-preview-content">
              <p className="preview-info">
                Preview of {barcodePreviewProducts.length} barcode label(s) - 50mm × 25mm (2 per row)
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
                          <label>Weight (grams):</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="e.g., 250"
                            value={barcodeWeights[p.productId] || ''}
                            onChange={(e) => setBarcodeWeights({ ...barcodeWeights, [p.productId]: e.target.value })}
                            className="weight-input"
                          />
                          <span className="input-unit">gm</span>
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
                      </div>
                    </div>
                  ))}
                </div>

                <p className="weight-info">
                  💡 <strong>Weight:</strong> For weight-based products, enter weight (e.g., 250gm) - it will be appended to barcode (
                  {(barcodePreviewProducts[0]?.barcode) || '1000A'} + 250 = {(barcodePreviewProducts[0]?.barcode) || '1000A'}250). Leave blank for pieces/cups.
                  <br />
                  💡 <strong>Best Before:</strong> Enter number of months (e.g., 12, 24, 36). Default is 12 months. Will display as &quot;12 months&quot; on the barcode.
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
