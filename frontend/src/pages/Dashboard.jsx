import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Receipt, 
  ClipboardList, 
  BarChart3, 
  Settings, 
  LogOut,
  Truck,
  UserCircle,
  Library
} from 'lucide-react';

import Inventory from './Inventory';
import Billing from './Billing';
import B2BBilling from './B2BBilling';
import B2BBillsPage from './B2BBillsPage';
import CancellationRequestsPage from './CancellationRequestsPage';
import Attendance from './Attendance';
import Staff from './Staff';
import BillsPage from './BillsPage';
import EditInvoicePage from './EditInvoicePage';
import Categories from './Categories';
import SettingsPage from './Settings';
import CourierPage from './CourierPage';
import ExpensePage from './ExpensePage';
import DailyAccountingPage from './DailyAccountingPage';
import ReportsPage from './ReportsPage';
import BossReportPage from './BossReportPage';
import './Dashboard.css';

// Sub-components for the Dashboard Grid – styled like old spices dashboard
const DashboardHome = ({ user, menuItems }) => {
  const navigate = useNavigate();
  const isAdmin = user.role === 'ADMIN';
  const companyName = user.companyName || user.company || '—';

  return (
    <div className="dashboard-content">
      <div className="dashboard-main-area">
        <div className="dashboard-header-wrap">
          <div className="dashboard-header">
            <h1>Welcome to your Dashboard!</h1>
            <p className="dashboard-subtitle">Manage your spices business efficiently</p>
          </div>
          <div className="dashboard-header-actions">
            <button className="logout-button" onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}>
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>

        <div className="dashboard-user-info">
          <p>User ID: {user.id ?? user.userId ?? '—'}</p>
          <p>Role: {user.role}</p>
          <p>Company: {companyName}</p>
        </div>

        <h2 className="dashboard-features-heading">
          {isAdmin ? 'Admin Features' : 'Cashier Features'}
        </h2>

        <div className="dashboard-feature-cards">
          {menuItems.map((item) => (
            <div
              key={item.path}
              className="dashboard-feature-card"
              onClick={() => navigate(item.path)}
            >
              <div className="dashboard-feature-icon">{item.displayIcon}</div>
              <h3>{item.label}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  if (!user) return <div className="loading">Loading...</div>;

  const isAdmin = user.role === 'ADMIN';

  const adminMenu = [
    { path: '/dashboard/bills', displayIcon: '📚', label: 'Bills', description: 'View and manage all previous bills' },
    { path: '/dashboard/b2b-bills', displayIcon: '🏢', label: 'B2B Bills Report', description: 'View and manage B2B invoices' },
    { path: '/dashboard/cancellation-requests', displayIcon: '⚠️', label: 'Cancellation Requests', description: 'Review and approve invoice cancellations' },
    { path: '/dashboard/inventory', displayIcon: '📦', label: 'Product Management', description: 'Manage products, stock and categories' },
    { path: '/dashboard/staff', displayIcon: '👥', label: 'Staff & HR', description: 'Manage employee accounts and salaries' },
    { path: '/dashboard/attendance', displayIcon: '📅', label: 'Attendance', description: 'View and mark daily attendance' },
    { path: '/dashboard/courier', displayIcon: '🚚', label: 'Courier', description: 'Track courier requests' },
    { path: '/dashboard/accounting', displayIcon: '💰', label: 'Accounting & Day Close', description: 'Daily accounting and payment splits' },
    { path: '/dashboard/boss-report', displayIcon: '📈', label: 'Boss Report', description: 'Most sale items & month-wise sales charts' },
    { path: '/dashboard/reports', displayIcon: '📊', label: 'Reports', description: 'Sales, GST and accounting reports' },
    { path: '/dashboard/settings', displayIcon: '⚙️', label: 'Settings', description: 'Company and system configuration' },
  ];

  const cashierMenu = [
    { path: '/dashboard/billing', displayIcon: '🧾', label: 'Create Invoice', description: 'Start new billing session' },
    { path: '/dashboard/b2b', displayIcon: '🏢', label: 'B2B Billing', description: 'Generate B2B invoices' },
    { path: '/dashboard/bills', displayIcon: '📚', label: 'Bills', description: 'View and reprint recent bills' },
    { path: '/dashboard/b2b-bills', displayIcon: '🏢', label: 'B2B Bills Report', description: 'View and manage B2B invoices' },
    { path: '/dashboard/expenses', displayIcon: '💰', label: 'Expenses', description: 'Record and view daily expenses' },
    { path: '/dashboard/inventory-view', displayIcon: '📦', label: 'Product Management', description: 'Search and check product availability' },
    { path: '/dashboard/attendance', displayIcon: '📅', label: 'My Attendance', description: 'Mark your daily attendance' },
    { path: '/dashboard/courier', displayIcon: '🚚', label: 'Courier', description: 'Track courier requests' },
  ];

  const menuItems = isAdmin ? adminMenu : cashierMenu;

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <Routes>
          {/* B2B edit is handled at App level so /dashboard/b2b/edit/:id always renders */}
          <Route path="/dashboard" element={<Outlet />}>
            <Route index element={<DashboardHome user={user} menuItems={menuItems} />} />
            <Route path="b2b" element={<B2BBilling />} />
            <Route path="b2b-bills" element={<B2BBillsPage />} />
            <Route path="billing" element={<Billing />} />
            <Route path="bills" element={<BillsPage />} />
            <Route path="bills/:invoiceId/edit" element={<EditInvoicePage />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory-view" element={<Inventory />} />
            <Route path="categories" element={<Categories />} />
            <Route path="cancellation-requests" element={<CancellationRequestsPage />} />
            <Route path="staff" element={<Staff />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="boss-report" element={<BossReportPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="courier" element={<CourierPage />} />
            <Route path="expenses" element={<ExpensePage />} />
            <Route path="accounting" element={<DailyAccountingPage />} />
          </Route>
          {/* Fallback for /dashboard so direct visit to /dashboard shows home */}
          <Route path="/" element={<DashboardHome user={user} menuItems={menuItems} />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/inventory-view" element={<Inventory />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/b2b" element={<B2BBilling />} />
          <Route path="/bills" element={<BillsPage />} />
          <Route path="/bills/:invoiceId/edit" element={<EditInvoicePage />} />
          <Route path="/b2b-bills" element={<B2BBillsPage />} />
          <Route path="/cancellation-requests" element={<CancellationRequestsPage />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/boss-report" element={<BossReportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/courier" element={<CourierPage />} />
          <Route path="/expenses" element={<ExpensePage />} />
          <Route path="/accounting" element={<DailyAccountingPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;
