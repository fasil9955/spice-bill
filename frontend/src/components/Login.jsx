import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const Login = () => {
  const [credentials, setCredentials] = useState({
    companyName: '',
    role: 'CASHIER',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      const { token, role, companyName, userId } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ role, companyName, userId }));
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🌶️ Spices Billing</h1>
          <p>Login to your account</p>
        </div>
        
        {error && <div className="error-message" style={{color: 'red', textAlign: 'center', marginBottom: '15px'}}>{error}</div>}
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              name="companyName"
              placeholder="Company Name"
              value={credentials.companyName}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <select
              name="role"
              value={credentials.role}
              onChange={handleChange}
              required
              className="role-select"
            >
              <option value="CASHIER">Cashier</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Don't have an account? <span className="link" onClick={() => navigate('/signup')}>Sign Up</span></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
