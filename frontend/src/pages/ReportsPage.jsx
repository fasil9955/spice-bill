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
  const [downloadingSales, setDownloadingSales] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    const loadSummary = () => {
      setTaxSummaryLoading(true);
      reportService
        .getGSTR1Summary(year, month)
        .then((res) => {
          if (!cancelled && res?.data) setTaxSummary(res.data);
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
      const nextPreview = res.data?.nextPreview || '';
      const renumbered = res.data?.renumbered ?? 0;
      setToolsMsg(
        deleted === 0
          ? `No cash bills in that date range. You can still re-sequence numbers.`
          : `Deleted ${deleted} cash bill(s). Remaining retail bills re-numbered (${renumbered}). Next bill: ${nextPreview}`
      );
      broadcastDataUpdate();
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
    } catch (err) {
      setToolsErr(
        err.response?.data?.error
        || (err.code === 'ECONNABORTED' ? 'Timed out. Wait 1 minute, then try Re-sequence once.' : (err.message || 'Failed to re-sequence numbers.'))
      );
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

  const handleMonthlySalesDownload = async () => {
    setError(null);
    setDownloadingSales(true);
    try {
      const res = await reportService.getMonthlySalesExport(year, month);
      await downloadExcelBlob(res, `Monthly_Sales_${MONTH_NAMES[month - 1]}_${year}.xlsx`);
    } catch (err) {
      setError(await excelErrorMessage(err));
    } finally {
      setDownloadingSales(false);
    }
  };

  const handleMonthlySalesPrint = async () => {
    setError(null);
    setPrintingSales(true);
    try {
      const res = await reportService.getMonthlySales(year, month);
      const data = res.data || {};
      const bills = data.bills || [];
      const totals = data.totals || {};
      let company = 'Our Spices Shop';
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user?.companyName) company = user.companyName;
      } catch (_) {}
      const money = (v) =>
        `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const rows = bills.map((b) => `
        <tr>
          <td>${b.date || ''}</td>
          <td>${b.invoiceNo || ''}</td>
          <td>${b.type || ''}</td>
          <td>${b.customer || ''}</td>
          <td>${b.phone || ''}</td>
          <td class="num">${money(b.taxable)}</td>
          <td class="num">${money(b.discount)}</td>
          <td class="num">${money(b.cgst)}</td>
          <td class="num">${money(b.sgst)}</td>
          <td class="num">${money(b.total)}</td>
          <td>${b.payment || ''}</td>
          <td>${b.status || ''}</td>
        </tr>
      `).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Monthly sales ${MONTH_NAMES[month - 1]} ${year}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 16px; }
          h1 { font-size: 16px; margin: 0 0 4px; }
          p { margin: 0 0 12px; color: #444; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
          th { background: #f3f4f6; }
          td.num, th.num { text-align: right; white-space: nowrap; }
          tfoot td { font-weight: 700; }
          @media print { body { padding: 0; } }
        </style></head><body>
        <h1>${company.replace(/</g, '&lt;')}</h1>
        <p>Monthly sales — all bills — ${MONTH_NAMES[month - 1]} ${year}</p>
        <table>
          <thead><tr>
            <th>Date</th><th>Invoice No</th><th>Type</th><th>Customer</th><th>Phone</th>
            <th class="num">Taxable</th><th class="num">Discount</th><th class="num">CGST</th><th class="num">SGST</th>
            <th class="num">Total</th><th>Payment</th><th>Status</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="12">No bills this month</td></tr>'}</tbody>
          <tfoot><tr>
            <td colspan="5">Total (active bills: ${totals.activeBills ?? 0})</td>
            <td class="num">${money(totals.taxable)}</td>
            <td class="num">${money(totals.discount)}</td>
            <td class="num">${money(totals.cgst)}</td>
            <td class="num">${money(totals.sgst)}</td>
            <td class="num">${money(totals.total)}</td>
            <td></td><td></td>
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
          Excel of every bill in the month: <strong>ALL_BILLS</strong>, <strong>B2C_BILLS</strong>, <strong>B2B_BILLS</strong>, and <strong>TOTALS</strong>.
          This is the shop record / officer backup (bill by bill). GSTR-1 filing still uses the summary file below.
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
              onClick={handleMonthlySalesDownload}
              disabled={downloadingSales}
            >
              <FileSpreadsheet size={18} />
              {downloadingSales ? 'Downloading…' : 'Download Excel'}
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
              Card, UPI, mixed, and B2B are kept. Stock is not added back.
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
            {toolsErr && <p className="reports-error">{toolsErr}</p>}
            {toolsMsg && <p className="reports-tools-ok">{toolsMsg}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
