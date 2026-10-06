import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const DEFAULT_RESET_EMAIL = 'fasilpvr52@gmail.com';

const Login = () => {
  const [credentials, setCredentials] = useState({
    companyName: '',
    role: 'CASHIER',
    password: ''
  });
  const [forgot, setForgot] = useState({
    companyName: '',
    role: 'CASHIER',
    email: DEFAULT_RESET_EMAIL
  });
  const [otpForm, setOtpForm] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [step, setStep] = useState('login');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleForgotChange = (e) => {
    const { name, value } = e.target;
    setForgot(prev => ({ ...prev, [name]: value }));
  };

  const openForgot = () => {
    setError('');
    setInfo('');
    setOtpForm({ otp: '', newPassword: '', confirmPassword: '' });
    setForgot({
      companyName: credentials.companyName,
      role: credentials.role,
      email: DEFAULT_RESET_EMAIL
    });
    setStep('forgot');
  };

  const backToLogin = () => {
    setStep('login');
    setError('');
    setInfo('');
    setOtpForm({ otp: '', newPassword: '', confirmPassword: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
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

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const response = await authService.forgotPassword(forgot);
      setInfo(response.data?.message || 'If this account matches, an OTP has been sent.');
      setStep('otp');
      setOtpForm({ otp: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send OTP email.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (otpForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (otpForm.newPassword !== otpForm.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = await authService.resetPassword({
        companyName: forgot.companyName,
        role: forgot.role,
        otp: otpForm.otp,
        newPassword: otpForm.newPassword,
        confirmPassword: otpForm.confirmPassword,
      });
      setInfo(response.data?.message || 'Password updated. You can now login.');
      setCredentials((prev) => ({ ...prev, companyName: forgot.companyName, role: forgot.role, password: '' }));
      setStep('login');
      setOtpForm({ otp: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const headerText =
    step === 'otp' ? 'Enter OTP and new password' : step === 'forgot' ? 'Reset your password' : 'Login to your account';

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🌶️ Spices Billing</h1>
          <p>{headerText}</p>
        </div>

        {error && <div className="error-message" style={{color: 'red', textAlign: 'center', marginBottom: '15px'}}>{error}</div>}
        {info && <div className="success-message" style={{color: '#166534', textAlign: 'center', marginBottom: '15px'}}>{info}</div>}

        {step === 'login' && (
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

            <div className="forgot-row">
              <button type="button" className="link-button" onClick={openForgot}>
                Forgot password?
              </button>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {step === 'forgot' && (
          <form className="login-form" onSubmit={handleForgotSubmit}>
            <p className="forgot-hint">
              Enter your company and role. A 6-digit OTP will be sent to fasilpvr52@gmail.com (valid 10 minutes).
            </p>
            <div className="form-group">
              <input
                type="text"
                name="companyName"
                placeholder="Company Name"
                value={forgot.companyName}
                onChange={handleForgotChange}
                required
              />
            </div>
            <div className="form-group">
              <select
                name="role"
                value={forgot.role}
                onChange={handleForgotChange}
                required
                className="role-select"
              >
                <option value="CASHIER">Cashier</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Recovery email"
                value={forgot.email}
                readOnly
                className="readonly-input"
              />
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            <button type="button" className="link-button back-to-login" onClick={backToLogin}>
              Back to login
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form className="login-form" onSubmit={handleOtpSubmit}>
            <p className="forgot-hint">
              Check fasilpvr52@gmail.com for the 6-digit OTP, then set a new password for {forgot.role} / {forgot.companyName || 'this company'}.
            </p>
            <div className="form-group">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6-digit OTP"
                value={otpForm.otp}
                onChange={(e) => setOtpForm((prev) => ({ ...prev, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="New password"
                value={otpForm.newPassword}
                onChange={(e) => setOtpForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Confirm new password"
                value={otpForm.confirmPassword}
                onChange={(e) => setOtpForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Updating...' : 'Verify OTP and update password'}
            </button>
            <button
              type="button"
              className="link-button back-to-login"
              disabled={loading}
              onClick={(e) => handleForgotSubmit(e)}
            >
              Resend OTP
            </button>
            <button type="button" className="link-button back-to-login" onClick={backToLogin}>
              Back to login
            </button>
          </form>
        )}

        <div className="login-footer">
          <p>Don't have an account? <span className="link" onClick={() => navigate('/signup')}>Sign Up</span></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
