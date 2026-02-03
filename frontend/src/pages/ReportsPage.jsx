import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { reportService } from '../services/api';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatMoney = (v) =>
  v == null || Number.isNaN(v) ? '₹0.00' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ReportsPage = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [taxSummary, setTaxSummary] = useState(null);
  const [taxSummaryLoading, setTaxSummaryLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
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
    return () => { cancelled = true; };
  }, [year, month]);

  const handleGSTR1Download = async () => {
    setError(null);
    setDownloading(true);
    try {
      const res = await reportService.getGSTR1Export(year, month);
      const blob = res.data;
      const contentDisposition = res.headers?.['content-disposition'];
      let fileName = `GSTR1_Sales_${MONTH_NAMES[month - 1]}_${year}.xlsx`;
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
    } catch (err) {
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
      setError(msg);
    } finally {
      setDownloading(false);
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
        <h2>GSTR-1 Export</h2>
        <p className="reports-desc">
          Download a single Excel file with 3 sheets: <strong>B2B_SALES</strong> (Table 4), <strong>B2C_SUMMARY</strong> (Table 7), and <strong>MONTHLY_SUMMARY</strong> (auditor check). File name: GSTR1_Sales_Jan_2026.xlsx
        </p>
        <div className="gstr1-controls">
          <div className="gstr1-field">
            <label>Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 2, year - 1, year, year + 1].map((y) => (
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
              onClick={handleGSTR1Download}
              disabled={downloading}
            >
              <FileSpreadsheet size={18} />
              {downloading ? 'Downloading…' : 'Download GSTR-1 Excel'}
            </button>
          </div>
        </div>
        {error && <p className="reports-error">{error}</p>}

        <div className="reports-tax-summary">
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
    </div>
  );
};

export default ReportsPage;
