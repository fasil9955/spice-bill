import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { ArrowLeft, TrendingUp, Package, CalendarDays, Search, X } from 'lucide-react';
import { reportService, productService } from '../services/api';
import './BossReportPage.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea', '#fed6e3'];
const WATCH_KEY = 'spice_boss_selected_products';

const toIsoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const loadWatchList = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(WATCH_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((p) => p && p.productId != null) : [];
  } catch {
    return [];
  }
};

const BossReportPage = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [topItems, setTopItems] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [reportDate, setReportDate] = useState(() => toIsoDate(now));
  const [daily, setDaily] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [watchList, setWatchList] = useState(loadWatchList);
  const [watchSales, setWatchSales] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [productQuery, setProductQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [topRes, monthlyRes] = await Promise.all([
        reportService.getTopSellingItems(year, month, 15),
        reportService.getMonthlyByYear(year),
      ]);
      const items = Array.isArray(topRes?.data) ? topRes.data : [];
      setTopItems(items.map((i) => ({
        name: (i.productName || 'Unknown').length > 18 ? (i.productName || '').slice(0, 18) + '…' : (i.productName || 'Unknown'),
        fullName: i.productName || 'Unknown',
        quantity: parseFloat(i.quantity) || 0,
        revenue: parseFloat(i.totalRevenue) || 0,
      })));

      const raw = Array.isArray(monthlyRes?.data) ? monthlyRes.data : [];
      setMonthlyData(raw.map((m) => ({
        month: MONTH_NAMES[(m.month || 1) - 1],
        monthNum: m.month || 0,
        sales: parseFloat(m.totalSales) || 0,
        invoices: m.totalInvoices || 0,
        itemsSold: m.totalItemsSold || 0,
      })));
    } catch (err) {
      console.error('Boss report fetch failed', err);
      setTopItems([]);
      setMonthlyData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month]);

  useEffect(() => {
    productService.getAll()
      .then((res) => setAllProducts(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setAllProducts([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(WATCH_KEY, JSON.stringify(watchList));
  }, [watchList]);

  useEffect(() => {
    let cancelled = false;
    const loadDaily = async () => {
      setDailyLoading(true);
      try {
        const ids = watchList.map((p) => p.productId);
        const [dayRes, prodRes] = await Promise.all([
          reportService.getDaily(reportDate),
          ids.length ? reportService.getDailyProductSales(reportDate, ids) : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;
        setDaily(dayRes?.data || null);
        setWatchSales(Array.isArray(prodRes?.data) ? prodRes.data : []);
      } catch (err) {
        console.error('Daily boss report failed', err);
        if (!cancelled) {
          setDaily(null);
          setWatchSales([]);
        }
      } finally {
        if (!cancelled) setDailyLoading(false);
      }
    };
    loadDaily();
    return () => { cancelled = true; };
  }, [reportDate, watchList]);

  const formatCurrency = (v) => (v == null || Number.isNaN(v) ? '₹0' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  const addWatchedProduct = (product) => {
    const id = product.productId;
    if (id == null || watchList.some((p) => p.productId === id)) return;
    setWatchList((prev) => [...prev, { productId: id, productName: product.productName || 'Unknown' }]);
    setProductQuery('');
    setPickerOpen(false);
  };

  const removeWatchedProduct = (productId) => {
    setWatchList((prev) => prev.filter((p) => p.productId !== productId));
  };

  const q = productQuery.trim().toLowerCase();
  const pickerMatches = q
    ? allProducts.filter((p) =>
        (p.productName || '').toLowerCase().includes(q)
        || (p.barcode || '').toLowerCase().includes(q)
        || (p.productCode || '').toLowerCase().includes(q)
      ).slice(0, 12)
    : [];

  const watchChart = watchSales.map((i) => ({
    name: (i.productName || 'Unknown').length > 16 ? `${(i.productName || '').slice(0, 16)}…` : (i.productName || 'Unknown'),
    fullName: i.productName || 'Unknown',
    quantity: parseFloat(i.quantity) || 0,
    revenue: parseFloat(i.totalRevenue) || 0,
  }));

  return (
    <div className="boss-report-page">
      <div className="boss-report-header">
        <div>
          <h1>Boss Report</h1>
          <p className="boss-report-subtitle">Daily sales, selected products, and month-wise charts</p>
        </div>
        <button type="button" className="boss-report-back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} /> Dashboard
        </button>
      </div>

      <div className="boss-report-controls">
        <div className="boss-report-field">
          <label>Day</label>
          <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
        </div>
        <div className="boss-report-field">
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="boss-report-field">
          <label>Month (for top items)</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      <section className="boss-report-section">
        <h2 className="boss-report-section-title">
          <CalendarDays size={22} /> Daily report ({reportDate.split('-').reverse().join('/')})
        </h2>
        <p className="boss-report-section-desc">Totals for the selected day, then only the products you pick below</p>
        {dailyLoading && !daily ? (
          <p className="boss-report-empty">Loading daily totals…</p>
        ) : (
          <div className="boss-daily-cards">
            <div className="boss-daily-card">
              <span>Sales</span>
              <strong>{formatCurrency(daily?.totalSales)}</strong>
            </div>
            <div className="boss-daily-card">
              <span>Bills</span>
              <strong>{daily?.totalInvoices ?? 0}</strong>
            </div>
            <div className="boss-daily-card">
              <span>Cash</span>
              <strong>{formatCurrency(daily?.cashSales)}</strong>
            </div>
            <div className="boss-daily-card">
              <span>Card</span>
              <strong>{formatCurrency(daily?.cardSales)}</strong>
            </div>
            <div className="boss-daily-card">
              <span>UPI</span>
              <strong>{formatCurrency(daily?.upiSales)}</strong>
            </div>
            <div className="boss-daily-card">
              <span>Mixed</span>
              <strong>{formatCurrency(daily?.mixedSales)}</strong>
            </div>
          </div>
        )}

        <h3 className="boss-watch-heading">Selected products</h3>
        <p className="boss-report-section-desc">Search and add items to watch. The list stays saved on this computer.</p>
        <div className="boss-watch-picker">
          <Search size={16} className="boss-watch-search-icon" />
          <input
            type="text"
            value={productQuery}
            onChange={(e) => {
              setProductQuery(e.target.value);
              setPickerOpen(true);
            }}
            onFocus={() => setPickerOpen(true)}
            placeholder="Search product name or barcode"
          />
          {pickerOpen && pickerMatches.length > 0 && (
            <ul className="boss-watch-dropdown">
              {pickerMatches.map((p) => (
                <li key={p.productId}>
                  <button type="button" onClick={() => addWatchedProduct(p)}>
                    {p.productName}
                    {p.barcode ? <span> · {p.barcode}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {watchList.length > 0 && (
          <div className="boss-watch-chips">
            {watchList.map((p) => (
              <span key={p.productId} className="boss-watch-chip">
                {p.productName}
                <button type="button" aria-label={`Remove ${p.productName}`} onClick={() => removeWatchedProduct(p.productId)}>
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        {watchList.length === 0 ? (
          <p className="boss-report-empty">Select products to see how much sold on this day.</p>
        ) : dailyLoading ? (
          <p className="boss-report-empty">Loading selected products…</p>
        ) : (
          <>
            <div className="boss-report-chart-wrap boss-watch-chart">
              <ResponsiveContainer width="100%" height={Math.max(220, watchChart.length * 36)}>
                <BarChart data={watchChart} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [value, 'Quantity']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="quantity" name="Quantity sold" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {watchChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="boss-watch-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Qty</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {watchSales.map((row) => (
                  <tr key={row.productId}>
                    <td>{row.productName}</td>
                    <td className="num">{Number(row.quantity || 0)}</td>
                    <td className="num">{formatCurrency(row.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {loading ? (
        <div className="boss-report-loading">Loading month charts…</div>
      ) : (
        <>
          <section className="boss-report-section">
            <h2 className="boss-report-section-title">
              <Package size={22} /> Most sale items ({MONTH_NAMES[month - 1]} {year})
            </h2>
            <p className="boss-report-section-desc">Top 15 products by quantity sold in the selected month</p>
            <div className="boss-report-chart-wrap">
              {topItems.length === 0 ? (
                <p className="boss-report-empty">No sales data for this month.</p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topItems} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tickFormatter={(v) => v} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [value, 'Quantity']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="quantity" name="Quantity sold" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {topItems.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="boss-report-section">
            <h2 className="boss-report-section-title">
              <TrendingUp size={22} /> Month-wise sales ({year})
            </h2>
            <p className="boss-report-section-desc">Total sales (₹) for each month of the selected year</p>
            <div className="boss-report-chart-wrap">
              {monthlyData.length === 0 ? (
                <p className="boss-report-empty">No monthly data for this year.</p>
              ) : (
                <ResponsiveContainer width="100%" height={360}>
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#667eea" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#764ba2" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), 'Sales']}
                      labelFormatter={(label) => label}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <Area type="monotone" dataKey="sales" name="Sales" stroke="#667eea" strokeWidth={2} fill="url(#salesGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="boss-report-section boss-report-bar-month">
            <h2 className="boss-report-section-title">Month-wise sales (bar view)</h2>
            <div className="boss-report-chart-wrap">
              {monthlyData.length === 0 ? (
                <p className="boss-report-empty">No monthly data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), 'Sales']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="sales" name="Sales" fill="#667eea" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default BossReportPage;
