import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, Printer, X } from 'lucide-react';
import { reportService, invoiceService } from '../services/api';
import { broadcastDataUpdate } from '../utils/dataSync';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatMoney = (v) =>
  v == null || Number.isNaN(v) ? '₹0.00' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const lastDayOfMonth = (year, month) => isoDate(new Date(year, month, 0));

const ReportsPage = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [downloading, setDownloading] = useState(false);
  const [downloadingSales, setDownloadingSales] = useState(null);
  const [printingSales, setPrintingSales] = useState(false);
  const [error, setError] = useState(null);
  const [taxSummary, setTaxSummary] = useState(null);
  const [taxSummaryLoading, setTaxSummaryLoading] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [fromDate, setFromDate] = useState(() => isoDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [toDate, setToDate] = useState(() => isoDate(now));
  const [toolsBusy, setToolsBusy] = useState(false);
  const [toolsMsg, setToolsMsg] = useState('');
  const [toolsErr, setToolsErr] = useState('');
  const [split5, setSplit5] = useState('');
  const [split18, setSplit18] = useState('');

  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

  const applySplitFromSummary = (data) => {
    if (!data) {
      setSplit5('');
      setSplit18('');
      return;
    }
    const remaining = round2(data.b2cRemainingTaxable);
    let t5 = round2(data.b2cTaxable5);
    let t18 = round2(data.b2cTaxable18);
    if (!data.b2cSplitApplied) {
      t5 = round2(data.b2cFromBills5);
      t18 = round2(remaining - t5);
    } else if (Math.abs(round2(t5 + t18) - remaining) > 0.02) {
      t5 = round2(data.b2cFromBills5);
      t18 = round2(remaining - t5);
    }
    if (t18 < 0) t18 = 0;
    setSplit5(t5.toFixed(2));
    setSplit18(t18.toFixed(2));
  };

  const loadTaxSummary = () => {
    setTaxSummaryLoading(true);
    return reportService
      .getGSTR1Summary(year, month)
      .then((res) => {
        if (res?.data) {
          setTaxSummary(res.data);
          applySplitFromSummary(res.data);
        }
        return res?.data;
      })
      .catch(() => {
        setTaxSummary(null);
        return null;
      })
      .finally(() => {
        setTaxSummaryLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    const loadSummary = () => {
      setTaxSummaryLoading(true);
      reportService
        .getGSTR1Summary(year, month)
        .then((res) => {
          if (!cancelled && res?.data) {
            setTaxSummary(res.data);
            applySplitFromSummary(res.data);
          }
        })
        .catch(() => {
          if (!cancelled) setTaxSummary(null);
        })
        .finally(() => {
          if (!cancelled) setTaxSummaryLoading(false);
        });
    };
    loadSummary();
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadSummary();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', loadSummary);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', loadSummary);
    };
  }, [year, month]);

  useEffect(() => {
    setFromDate(isoDate(new Date(year, month - 1, 1)));
    setToDate(lastDayOfMonth(year, month));
  }, [year, month]);

  const closeTools = () => {
    if (toolsBusy) return;
    setToolsOpen(false);
    setToolsErr('');
    setToolsMsg('');
  };

  const handleDeleteCashBillsRange = async () => {
    if (!fromDate || !toDate) {
      setToolsErr('Select from and to dates.');
      return;
    }
    if (toDate < fromDate) {
      setToolsErr('To date cannot be before from date.');
      return;
    }
    setToolsBusy(true);
    setToolsErr('');
    setToolsMsg('');
    try {
      const res = await invoiceService.deleteCashBillsForDates(fromDate, toDate);
      const deleted = res.data?.deleted ?? 0;
      const mixedAdjusted = res.data?.mixedAdjusted ?? 0;
      const nextPreview = res.data?.nextPreview || '';
      const renumbered = res.data?.renumbered ?? 0;
      const parts = [];
      if (deleted > 0) parts.push(`Deleted ${deleted} cash bill(s)`);
      if (mixedAdjusted > 0) {
        parts.push(
          `removed cash from ${mixedAdjusted} mixed bill(s); those bills now equal card/UPI only`
        );
      }
      setToolsMsg(
        parts.length === 0
          ? `No cash or mixed-with-cash bills in that date range. You can still re-sequence numbers.`
          : `${parts.join('. ')}. Remaining retail bills re-numbered (${renumbered}). Next bill: ${nextPreview}`
      );
      broadcastDataUpdate();
      await loadTaxSummary();
    } catch (err) {
      setToolsErr(err.response?.data?.error || err.message || 'Failed to delete cash bills.');
    } finally {
      setToolsBusy(false);
    }
  };

  const handleResequenceNumbers = async () => {
    setToolsBusy(true);
    setToolsErr('');
    setToolsMsg('Updating bill numbers… keep this window open.');
    try {
      const res = await invoiceService.alignRetailGstNumbers();
      const updated = res.data?.updated ?? 0;
      const nextPreview = res.data?.nextPreview || '';
      setToolsMsg(
        updated === 0
          ? `No retail bills to re-number. Next bill: ${nextPreview || 'R/YYYY/00001'}.`
          : `Re-sequenced ${updated} retail bill number(s). Next bill: ${nextPreview}. Reprint any bill already given to a customer.`
      );
      broadcastDataUpdate();
      await loadTaxSummary();
    } catch (err) {
      setToolsErr(
        err.response?.data?.error
        || (err.code === 'ECONNABORTED' ? 'Timed out. Wait 1 minute, then try Re-sequence once.' : (err.message || 'Failed to re-sequence numbers.'))
      );
    } finally {
      setToolsBusy(false);
    }
  };

  const remainingB2c = round2(taxSummary?.b2cRemainingTaxable);

  const parseAmount = (raw) => {
    const t = String(raw ?? '').replace(/,/g, '').trim();
    if (t === '' || t === '.') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const isAmountDraft = (raw) => /^\d*\.?\d{0,2}$/.test(String(raw ?? '').replace(/,/g, '').trim());

  const commitSplit5 = (raw) => {
    const n = parseAmount(raw);
    const clamped = Math.min(remainingB2c, Math.max(0, round2(n ?? 0)));
    setSplit5(clamped.toFixed(2));
    setSplit18(round2(remainingB2c - clamped).toFixed(2));
  };

  const commitSplit18 = (raw) => {
    const n = parseAmount(raw);
    const clamped = Math.min(remainingB2c, Math.max(0, round2(n ?? 0)));
    setSplit18(clamped.toFixed(2));
    setSplit5(round2(remainingB2c - clamped).toFixed(2));
  };

  const onSplit5Change = (raw) => {
    if (!isAmountDraft(raw)) return;
    setSplit5(raw);
    const n = parseAmount(raw);
    if (n == null) return;
    const clamped = Math.min(remainingB2c, Math.max(0, round2(n)));
    setSplit18(round2(remainingB2c - clamped).toFixed(2));
  };

  const onSplit18Change = (raw) => {
    if (!isAmountDraft(raw)) return;
    setSplit18(raw);
    const n = parseAmount(raw);
    if (n == null) return;
    const clamped = Math.min(remainingB2c, Math.max(0, round2(n)));
    setSplit5(round2(remainingB2c - clamped).toFixed(2));
  };

  const handleSaveGstSplit = async () => {
    const t5 = round2(split5);
    const t18 = round2(split18);
    if (Math.abs(round2(t5 + t18) - remainingB2c) > 0.02) {
      setToolsErr(`5% and 18% must add up to remaining taxable ${remainingB2c.toFixed(2)}.`);
      return;
    }
    setToolsBusy(true);
    setToolsErr('');
    try {
      const res = await reportService.saveB2cGstSplit(year, month, t5, t18);
      if (res?.data) {
        setTaxSummary(res.data);
        applySplitFromSummary(res.data);
      }
      setToolsMsg(
        `Saved for ${MONTH_NAMES[month - 1]} ${year}: ₹${t5.toFixed(2)} at 5% and ₹${t18.toFixed(2)} at 18%. GSTR-1 Excel uses this split.`
      );
    } catch (err) {
      setToolsErr(err.response?.data?.error || err.message || 'Failed to save GST split.');
    } finally {
      setToolsBusy(false);
    }
  };

  const downloadExcelBlob = async (res, fallbackName) => {
    const blob = res.data;
    const contentDisposition = res.headers?.['content-disposition'];
    let fileName = fallbackName;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        fileName = match[1].replace(/['"]/g, '').trim();
      }
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const excelErrorMessage = async (err) => {
    let msg = err.message || 'Download failed';
    const data = err.response?.data;
    if (data) {
      if (typeof data === 'object' && data.error) msg = data.error;
      else if (data instanceof Blob && data.type?.includes('json')) {
        try {
          const text = await data.text();
          const parsed = JSON.parse(text);
          if (parsed.error) msg = parsed.error;
        } catch (_) {}
      }
    }
    return msg;
  };

  const handleGSTR1Download = async () => {
    setError(null);
    setDownloading(true);
    try {
      const res = await reportService.getGSTR1Export(year, month);
      await downloadExcelBlob(res, `GSTR1_Sales_${MONTH_NAMES[month - 1]}_${year}.xlsx`);
    } catch (err) {
      setError(await excelErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const handleMonthlySalesDownload = async (kind = 'all') => {
    setError(null);
    setDownloadingSales(kind);
    const names = {
      b2c: `Monthly_Sales_B2C_${MONTH_NAMES[month - 1]}_${year}.xlsx`,
      b2b: `Monthly_Sales_B2B_${MONTH_NAMES[month - 1]}_${year}.xlsx`,
    };
    try {
      const res = await reportService.getMonthlySalesExport(year, month, kind);
      await downloadExcelBlob(res, names[kind] || names.b2c);
    } catch (err) {
      setError(await excelErrorMessage(err));
    } finally {
      setDownloadingSales(null);
    }
  };

  const handleMonthlySalesPrint = async () => {
    setError(null);
    setPrintingSales(true);
    try {
      const res = await reportService.getMonthlySales(year, month);
      const data = res.data || {};
      const b2c = data.b2c || [];
      const b2b = data.b2b || [];
      const b2cTotals = data.b2cTotals || {};
      const b2bTotals = data.b2bTotals || {};
      let company = 'Our Spices Shop';
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user?.companyName) company = user.companyName;
      } catch (_) {}
      const money = (v) =>
        `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const b2cRows = b2c.map((b) => `
        <tr>
          <td>${b.date || ''}</td>
          <td>${b.invoiceNo || ''}</td>
          <td class="num">${money(b.total)}</td>
        </tr>
      `).join('');
      const b2bRows = b2b.map((b) => `
        <tr>
          <td>${b.date || ''}</td>
          <td>${b.invoiceNo || ''}</td>
          <td>${b.type || ''}</td>
          <td>${b.customer || ''}</td>
          <td>${b.gstin || ''}</td>
          <td class="num">${money(b.taxable)}</td>
          <td class="num">${money(b.cgst)}</td>
          <td class="num">${money(b.sgst)}</td>
          <td class="num">${money(b.total)}</td>
          <td>${b.status || ''}</td>
        </tr>
      `).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Monthly sales ${MONTH_NAMES[month - 1]} ${year}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 16px; }
          h1 { font-size: 16px; margin: 0 0 4px; }
          h2 { font-size: 13px; margin: 16px 0 8px; }
          p { margin: 0 0 12px; color: #444; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
          th { background: #f3f4f6; }
          td.num, th.num { text-align: right; white-space: nowrap; }
          tfoot td { font-weight: 700; }
          @media print { body { padding: 0; } }
        </style></head><body>
        <h1>${company.replace(/</g, '&lt;')}</h1>
        <p>Monthly sales — ${MONTH_NAMES[month - 1]} ${year}</p>
        <h2>B2C (retail)</h2>
        <table>
          <thead><tr>
            <th>Date</th><th>Invoice No</th><th class="num">Total</th>
          </tr></thead>
          <tbody>${b2cRows || '<tr><td colspan="3">No B2C bills this month</td></tr>'}</tbody>
          <tfoot><tr>
            <td colspan="2">Total (active bills: ${b2cTotals.activeBills ?? 0})</td>
            <td class="num">${money(b2cTotals.total)}</td>
          </tr></tfoot>
        </table>
        <h2>B2B</h2>
        <table>
          <thead><tr>
            <th>Date</th><th>Invoice No</th><th>Type</th><th>Customer</th><th>GSTIN</th>
            <th class="num">Taxable</th><th class="num">CGST</th><th class="num">SGST</th>
            <th class="num">Total</th><th>Status</th>
          </tr></thead>
          <tbody>${b2bRows || '<tr><td colspan="10">No B2B bills this month</td></tr>'}</tbody>
          <tfoot><tr>
            <td colspan="5">Total (active bills: ${b2bTotals.activeBills ?? 0})</td>
            <td class="num">${money(b2bTotals.taxable)}</td>
            <td class="num">${money(b2bTotals.cgst)}</td>
            <td class="num">${money(b2bTotals.sgst)}</td>
            <td class="num">${money(b2bTotals.total)}</td>
            <td></td>
          </tr></tfoot>
        </table>
        </body></html>`;
      const w = window.open('', '_blank');
      if (!w) {
        setError('Allow pop-ups to print the monthly sales list.');
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Print failed');
    } finally {
      setPrintingSales(false);
    }
  };

  return (
    <div className="dashboard-content reports-page">
      <div className="reports-header">
        <button type="button" className="back-button" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1>Reports</h1>
        <p className="reports-subtitle">Sales, GST and accounting reports</p>
      </div>

      <section className="reports-section gstr1-section">
        <h2>Monthly sales (all bills)</h2>
        <p className="reports-desc">
          Shop record / officer backup (bill by bill). Download B2C or B2B Excel separately.
          B2C Excel has date, invoice number and total only. GSTR-1 filing still uses the summary file below.
        </p>
        <div className="gstr1-controls">
          <div className="gstr1-field">
            <label>Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="gstr1-field">
            <label>Month</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div className="gstr1-field gstr1-action">
            <label>&nbsp;</label>
            <button
              type="button"
              className="gstr1-download-btn"
              onClick={() => handleMonthlySalesDownload('b2c')}
              disabled={!!downloadingSales}
            >
              <FileSpreadsheet size={18} />
              {downloadingSales === 'b2c' ? 'Downloading…' : 'Download B2C Excel'}
            </button>
          </div>
          <div className="gstr1-field gstr1-action">
            <label>&nbsp;</label>
            <button
              type="button"
              className="gstr1-download-btn"
              onClick={() => handleMonthlySalesDownload('b2b')}
              disabled={!!downloadingSales}
            >
              <FileSpreadsheet size={18} />
              {downloadingSales === 'b2b' ? 'Downloading…' : 'Download B2B Excel'}
            </button>
          </div>
          <div className="gstr1-field gstr1-action">
            <label>&nbsp;</label>
            <button
              type="button"
              className="gstr1-print-btn"
              onClick={handleMonthlySalesPrint}
              disabled={printingSales}
            >
              <Printer size={18} />
              {printingSales ? 'Opening…' : 'Print list'}
            </button>
          </div>
        </div>
        {error && <p className="reports-error">{error}</p>}
      </section>

      <section className="reports-section gstr1-section">
        <h2>GSTR-1 Export</h2>
        <p className="reports-desc">
          Download a single Excel file with 3 sheets: <strong>B2B_SALES</strong> (Table 4), <strong>B2C_SUMMARY</strong> (Table 7), and <strong>MONTHLY_SUMMARY</strong> (auditor check). File name: GSTR1_Sales_Jan_2026.xlsx
        </p>
        <div className="gstr1-controls">
          <div className="gstr1-field gstr1-action">
            <label>&nbsp;</label>
            <button
              type="button"
              className="gstr1-download-btn"
              onClick={handleGSTR1Download}
              disabled={downloading}
            >
              <FileSpreadsheet size={18} />
              {downloading ? 'Downloading…' : 'Download GSTR-1 Excel'}
            </button>
          </div>
        </div>

        <div className="reports-tax-summary">
          <button
            type="button"
            className="reports-tools-hit"
            aria-label="Open cash bill tools"
            onClick={() => {
              setToolsErr('');
              setToolsMsg('');
              setToolsOpen(true);
            }}
          />
          <h3>Tax summary ({MONTH_NAMES[month - 1]} {year})</h3>
          {taxSummaryLoading ? (
            <p className="reports-tax-loading">Loading…</p>
          ) : taxSummary ? (
            <table className="reports-tax-table">
              <thead>
                <tr>
                  <th>Tax type</th>
                  <th className="reports-tax-amount">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Taxable value</td>
                  <td className="reports-tax-amount">{formatMoney(taxSummary.taxableValue)}</td>
                </tr>
                <tr>
                  <td>B2C taxable 5%</td>
                  <td className="reports-tax-amount">{formatMoney(taxSummary.b2cTaxable5)}</td>
                </tr>
                <tr>
                  <td>B2C taxable 18%</td>
                  <td className="reports-tax-amount">{formatMoney(taxSummary.b2cTaxable18)}</td>
                </tr>
                <tr>
                  <td><strong>CGST</strong></td>
                  <td className="reports-tax-amount">{formatMoney(taxSummary.cgst)}</td>
                </tr>
                <tr>
                  <td><strong>SGST</strong></td>
                  <td className="reports-tax-amount">{formatMoney(taxSummary.sgst)}</td>
                </tr>
                <tr>
                  <td><strong>IGST</strong></td>
                  <td className="reports-tax-amount">{formatMoney(taxSummary.igst)}</td>
                </tr>
                <tr className="reports-tax-total-row">
                  <td><strong>Total tax</strong></td>
                  <td className="reports-tax-amount">{formatMoney(taxSummary.totalTax)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="reports-tax-empty">No tax data for this month or failed to load.</p>
          )}
        </div>
      </section>

      {toolsOpen && (
        <div className="reports-tools-overlay" role="dialog" aria-modal="true" aria-labelledby="reports-tools-title">
          <div className="reports-tools-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reports-tools-modal-head">
              <h2 id="reports-tools-title">Cash bills</h2>
              <button type="button" className="reports-tools-close" onClick={closeTools} disabled={toolsBusy} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <p className="reports-tools-step">1. Delete cash bills by date</p>
            <p className="reports-desc">
              Permanently deletes retail bills paid fully as <strong>Cash</strong> between the dates.
              Mixed bills that include cash are kept, with the cash part removed so the bill total
              matches card/UPI only. Pure card, UPI, and B2B are unchanged. Stock is not added back.
            </p>
            <div className="reports-tools-dates">
              <label>
                From
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={toolsBusy} />
              </label>
              <label>
                To
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={toolsBusy} />
              </label>
            </div>
            <button
              type="button"
              className="reports-tools-delete"
              onClick={handleDeleteCashBillsRange}
              disabled={toolsBusy}
            >
              {toolsBusy ? 'Working…' : 'Delete cash bills'}
            </button>
            <p className="reports-tools-step">2. Re-sequence numbers</p>
            <p className="reports-desc">
              Remaining retail bills are numbered in date order (GST series). B2B numbers are not changed.
              Do not run if those bills are already filed in GSTR-1.
            </p>
            <button
              type="button"
              className="gstr1-print-btn"
              onClick={handleResequenceNumbers}
              disabled={toolsBusy}
            >
              {toolsBusy ? 'Working…' : 'Re-sequence numbers'}
            </button>
            <p className="reports-tools-step">3. Remaining taxable — 5% / 18%</p>
            <p className="reports-desc">
              After cash bills are removed, remaining B2C taxable for <strong>{MONTH_NAMES[month - 1]} {year}</strong>
              can be split for GSTR-1 (Table 7). Enter one amount; the other fills automatically.
            </p>
            <div className="reports-tools-split">
              <div className="reports-tools-split-row">
                <span>Remaining taxable</span>
                <strong>{formatMoney(taxSummary?.b2cRemainingTaxable)}</strong>
              </div>
              <div className="reports-tools-split-row">
                <span>On bills now (5% / 18%)</span>
                <span>
                  {formatMoney(taxSummary?.b2cFromBills5)} / {formatMoney(taxSummary?.b2cFromBills18)}
                </span>
              </div>
              {Number(taxSummary?.b2cFromBillsOther) > 0.009 && (
                <p className="reports-tools-split-hint">
                  Other rates on bills: {formatMoney(taxSummary.b2cFromBillsOther)}. Your split below uses the full remaining taxable.
                </p>
              )}
              <label>
                Taxable under 5%
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={split5}
                  disabled={toolsBusy || remainingB2c <= 0}
                  onChange={(e) => onSplit5Change(e.target.value)}
                  onBlur={() => commitSplit5(split5)}
                />
              </label>
              <label>
                Taxable under 18%
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={split18}
                  disabled={toolsBusy || remainingB2c <= 0}
                  onChange={(e) => onSplit18Change(e.target.value)}
                  onBlur={() => commitSplit18(split18)}
                />
              </label>
            </div>
            <button
              type="button"
              className="gstr1-download-btn"
              onClick={handleSaveGstSplit}
              disabled={toolsBusy || remainingB2c <= 0}
            >
              {toolsBusy ? 'Working…' : 'Save 5% / 18% split'}
            </button>
            {toolsErr && <p className="reports-error">{toolsErr}</p>}
            {toolsMsg && <p className="reports-tools-ok">{toolsMsg}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
