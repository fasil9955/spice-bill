import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
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
import Attendance from './Attendance';
import Staff from './Staff';
import BillsPage from './BillsPage';
import Categories from './Categories';

// Sub-components for the Dashboard Grid
const DashboardHome = ({ user, menuItems }) => {
  const navigate = useNavigate();
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <div>
          <h1>🌶️ Spices Billing System</h1>
          <p>Welcome back, {user.username} ({user.role})</p>
        </div>
        <div className="header-actions">
          <button className="logout-button" onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      <div className="welcome-card" style={{marginBottom: '30px'}}>
        <h2>Dashboard Overview</h2>
        <p>Select a module to get started with your billing and management tasks.</p>
      </div>

      <div className={isAdmin ? "admin-features" : "cashier-features"}>
        <div className="feature-cards">
          {menuItems.map((item) => (
            <div 
              key={item.path} 
              className="feature-card" 
              onClick={() => navigate(item.path)}
            >
              <div className="feature-icon">{item.displayIcon}</div>
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
    { path: '/dashboard/billing', displayIcon: '🧾', label: 'Quick Billing', description: 'Generate receipts for walk-in customers' },
    { path: '/dashboard/b2b', displayIcon: '🏢', label: 'B2B Invoices', description: 'Create and manage formal tax invoices' },
    { path: '/dashboard/bills', displayIcon: '📚', label: 'Bills Page', description: 'View and manage all previous bills' },
    { path: '/dashboard/inventory', displayIcon: '📦', label: 'Product Management', description: 'Manage products, stock and categories' },
    { path: '/dashboard/staff', displayIcon: '👥', label: 'Staff & HR', description: 'Manage employee accounts and salaries' },
    { path: '/dashboard/attendance', displayIcon: '📅', label: 'Attendance', description: 'View and mark daily attendance' },
    { path: '/dashboard/courier', displayIcon: '🚚', label: 'Courier', description: 'Track courier requests' },
    { path: '/dashboard/reports', displayIcon: '📊', label: 'Reports', description: 'Sales, GST and accounting reports' },
    { path: '/dashboard/settings', displayIcon: '⚙️', label: 'Settings', description: 'Company and system configuration' },
  ];

  const cashierMenu = [
    { path: '/dashboard/billing', displayIcon: '🧾', label: 'Billing Terminal', description: 'Start new billing session' },
    { path: '/dashboard/b2b', displayIcon: '🏢', label: 'B2B Billing', description: 'Generate B2B invoices' },
    { path: '/dashboard/bills', displayIcon: '📚', label: 'Bills Page', description: 'View and reprint recent bills' },
    { path: '/dashboard/inventory-view', displayIcon: '📦', label: 'Product Management', description: 'Search and check product availability' },
    { path: '/dashboard/attendance', displayIcon: '📅', label: 'My Attendance', description: 'Mark your daily attendance' },
  ];

  const menuItems = isAdmin ? adminMenu : cashierMenu;

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardHome user={user} menuItems={menuItems} />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/inventory-view" element={<Inventory />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/b2b" element={<div className="dashboard-content"><button onClick={() => navigate('/dashboard')} className="back-button">← Back</button><h1>B2B Bills Management</h1></div>} />
          <Route path="/bills" element={<BillsPage />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/reports" element={<div className="dashboard-content"><button onClick={() => navigate('/dashboard')} className="back-button">← Back</button><h1>Reports</h1></div>} />
          <Route path="/settings" element={<div className="dashboard-content"><button onClick={() => navigate('/dashboard')} className="back-button">← Back</button><h1>Settings</h1></div>} />
          <Route path="/courier" element={<div className="dashboard-content"><button onClick={() => navigate('/dashboard')} className="back-button">← Back</button><h1>Courier Requests</h1></div>} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;
