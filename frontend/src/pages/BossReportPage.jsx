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
import { ArrowLeft, TrendingUp, Package } from 'lucide-react';
import { reportService } from '../services/api';
import './BossReportPage.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea', '#fed6e3'];

const BossReportPage = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [topItems, setTopItems] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

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

  const formatCurrency = (v) => (v == null || Number.isNaN(v) ? '₹0' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  return (
    <div className="boss-report-page">
      <div className="boss-report-header">
        <div>
          <h1>Boss Report</h1>
          <p className="boss-report-subtitle">Most sale items &amp; month-wise sales at a glance</p>
        </div>
        <button type="button" className="boss-report-back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} /> Dashboard
        </button>
      </div>

      <div className="boss-report-controls">
        <div className="boss-report-field">
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 2, year - 1, year, year + 1].map((y) => (
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

      {loading ? (
        <div className="boss-report-loading">Loading report…</div>
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
