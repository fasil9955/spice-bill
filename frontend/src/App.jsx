import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './pages/Dashboard';
import B2BBilling from './pages/B2BBilling';
import './App.css';
import './pages/Dashboard.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* B2B edit: match at App level so it always renders (avoids Dashboard route ambiguity) */}
        <Route
          path="/dashboard/b2b/edit/:invoiceId"
          element={
            <ProtectedRoute>
              <div className="dashboard-container">
                <main className="main-content">
                  <B2BBilling />
                </main>
              </div>
            </ProtectedRoute>
          }
        />
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
