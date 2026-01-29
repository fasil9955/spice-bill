import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const Signup = () => {
  const [userData, setUserData] = useState({
    companyName: '',
    adminPassword: '',
    cashierPassword: '',
    gstNumber: '',
    fssaiLicense: '',
    address: '',
    phoneNumber: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.signup(userData);
      alert('Company registered successfully! You can now login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card" style={{maxWidth: '600px'}}>
        <div className="signup-header">
          <h1>🌶️ Spices Billing</h1>
          <p>Register your company and setup passwords</p>
        </div>
        
        {error && <div className="error-message" style={{color: 'red', textAlign: 'center', marginBottom: '15px'}}>{error}</div>}
        
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Company Name</label>
            <input
              type="text"
              name="companyName"
              placeholder="e.g. My Spices Shop"
              value={userData.companyName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Admin Password</label>
              <input
                type="password"
                name="adminPassword"
                placeholder="For management view"
                value={userData.adminPassword}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Cashier Password</label>
              <input
                type="password"
                name="cashierPassword"
                placeholder="For billing view"
                value={userData.cashierPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>GST Number</label>
              <input
                type="text"
                name="gstNumber"
                placeholder="GSTIN"
                value={userData.gstNumber}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>FSSAI License</label>
              <input
                type="text"
                name="fssaiLicense"
                placeholder="FSSAI Number"
                value={userData.fssaiLicense}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              name="phoneNumber"
              placeholder="Primary contact"
              value={userData.phoneNumber}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea
              name="address"
              placeholder="Shop address for bills"
              value={userData.address}
              onChange={handleChange}
              rows="3"
              style={{padding: '12px', borderRadius: '8px', border: '2px solid #e0e0e0'}}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Registering...' : 'Register Company'}
          </button>
        </form>
        
        <div className="signup-footer">
          <p>Already have an account? <span className="link" onClick={() => navigate('/login')}>Login</span></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
