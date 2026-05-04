import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { ArrowLeft, Building2, Lock, Save } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [company, setCompany] = useState({
    companyName: '',
    barcodeLabelCompanyName: '',
    gstNumber: '',
    fssaiLicense: '',
    address: '',
    phoneNumber: '',
    packingLicenceNo: '',
    customerCareNumber: '',
    customerCareEmail: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    b2bInvoiceStart: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    role: 'ADMIN',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fetchCompanyDetails = async () => {
    try {
      const response = await authService.getCompanyDetails();
      const d = response.data;
      setCompany({
        companyName: d.companyName ?? '',
        barcodeLabelCompanyName: d.barcodeLabelCompanyName ?? '',
        gstNumber: d.gstNumber ?? '',
        fssaiLicense: d.fssaiLicense ?? '',
        address: d.address ?? '',
        phoneNumber: d.phoneNumber ?? '',
        packingLicenceNo: d.packingLicenceNo ?? '',
        customerCareNumber: d.customerCareNumber ?? '',
        customerCareEmail: d.customerCareEmail ?? '',
        bankName: d.bankName ?? '',
        accountNumber: d.accountNumber ?? '',
        ifscCode: d.ifscCode ?? '',
        branchName: d.branchName ?? '',
        b2bInvoiceStart: d.b2bInvoiceStart != null ? String(d.b2bInvoiceStart) : '',
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load company details' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, []);

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    setMessage({ type: '', text: '' });
    try {
      await authService.updateCompanyDetails({
        barcodeLabelCompanyName: (company.barcodeLabelCompanyName || '').trim(),
        gstNumber: company.gstNumber,
        fssaiLicense: company.fssaiLicense,
        address: company.address,
        phoneNumber: company.phoneNumber,
        packingLicenceNo: company.packingLicenceNo,
        customerCareNumber: company.customerCareNumber,
        customerCareEmail: company.customerCareEmail,
        bankName: company.bankName,
        accountNumber: company.accountNumber,
        ifscCode: company.ifscCode,
        branchName: company.branchName,
        b2bInvoiceStart: company.b2bInvoiceStart ? parseInt(company.b2bInvoiceStart, 10) : null,
      });
      setMessage({ type: 'success', text: 'Company details saved successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save company details' });
    } finally {
      setSavingCompany(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setSavingPassword(true);
    setMessage({ type: '', text: '' });
    try {
      await authService.changePassword({
        role: passwordForm.role,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      setPasswordForm({ ...passwordForm, currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="employees-container">
        <div className="employees-header">
          <h1>⚙️ Settings</h1>
        </div>
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="employees-container">
      <div className="employees-header">
        <div>
          <h1>⚙️ Settings</h1>
          <p>Company and system configuration</p>
        </div>
        <div className="header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`settings-message ${message.type === 'error' ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      <div className="settings-sections">
        <section className="settings-section">
          <h2><Building2 size={20} /> Company Details</h2>
          <form onSubmit={handleCompanySubmit} className="settings-form">
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" value={company.companyName} readOnly disabled className="readonly-input" />
              <p className="settings-field-hint">Used on invoices and billing (your registered company name).</p>
            </div>
            <div className="form-group">
              <label>Name on barcode labels</label>
              <input
                type="text"
                value={company.barcodeLabelCompanyName}
                onChange={(e) => setCompany({ ...company, barcodeLabelCompanyName: e.target.value })}
                placeholder="Optional — e.g. brand name for printed product stickers"
                maxLength={200}
              />
              <p className="settings-field-hint">
                If set, barcode printing uses this by default. Leave blank to use the company name above on labels.
              </p>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>GST Number</label>
                <input
                  type="text"
                  value={company.gstNumber}
                  onChange={(e) => setCompany({ ...company, gstNumber: e.target.value })}
                  placeholder="e.g. 29XXXXX1234X1ZX"
                />
              </div>
              <div className="form-group">
                <label>FSSAI License</label>
                <input
                  type="text"
                  value={company.fssaiLicense}
                  onChange={(e) => setCompany({ ...company, fssaiLicense: e.target.value })}
                  placeholder="FSSAI license number"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                placeholder="Business address"
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                value={company.phoneNumber}
                onChange={(e) => setCompany({ ...company, phoneNumber: e.target.value })}
                placeholder="Contact number"
              />
            </div>
            <div className="form-group">
              <label>Packing Licence No</label>
              <input
                type="text"
                value={company.packingLicenceNo}
                onChange={(e) => setCompany({ ...company, packingLicenceNo: e.target.value })}
                placeholder="e.g., 123456789"
              />
            </div>
            <div className="form-group">
              <label>Customer Care No</label>
              <input
                type="text"
                value={company.customerCareNumber}
                onChange={(e) => setCompany({ ...company, customerCareNumber: e.target.value })}
                placeholder="e.g., 9876543210"
              />
            </div>
            <div className="form-group">
              <label>Customer Care Email</label>
              <input
                type="email"
                value={company.customerCareEmail}
                onChange={(e) => setCompany({ ...company, customerCareEmail: e.target.value })}
                placeholder="e.g., support@company.com"
              />
            </div>
            <h3 className="settings-subheading">Bank Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  value={company.bankName}
                  onChange={(e) => setCompany({ ...company, bankName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  value={company.accountNumber}
                  onChange={(e) => setCompany({ ...company, accountNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>IFSC Code</label>
                <input
                  type="text"
                  value={company.ifscCode}
                  onChange={(e) => setCompany({ ...company, ifscCode: e.target.value })}
                  placeholder="e.g. SBIN0001234"
                />
              </div>
              <div className="form-group">
                <label>Branch Name</label>
                <input
                  type="text"
                  value={company.branchName}
                  onChange={(e) => setCompany({ ...company, branchName: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>B2B Invoice Start Number</label>
              <input
                type="number"
                min="1"
                value={company.b2bInvoiceStart}
                onChange={(e) => setCompany({ ...company, b2bInvoiceStart: e.target.value })}
                placeholder="Starting number for B2B invoices"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={savingCompany}>
                <Save size={18} /> {savingCompany ? 'Saving...' : 'Save Company Details'}
              </button>
            </div>
          </form>
        </section>

        <section className="settings-section">
          <h2><Lock size={20} /> Change Password</h2>
          <form onSubmit={handlePasswordSubmit} className="settings-form">
            <div className="form-group">
              <label>Account (Role)</label>
              <select
                value={passwordForm.role}
                onChange={(e) => setPasswordForm({ ...passwordForm, role: e.target.value })}
              >
                <option value="ADMIN">Admin</option>
                <option value="CASHIER">Cashier</option>
              </select>
            </div>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
                placeholder="Re-enter new password"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={savingPassword}>
                <Lock size={18} /> {savingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Settings;
