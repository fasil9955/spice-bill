import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, invoiceService, accountingService } from '../services/api';
import AppUpdateCard from '../components/AppUpdateCard';
import { broadcastDataUpdate } from '../utils/dataSync';
import { normalizeUpiAccounts } from '../utils/upiAccounts';
import { ArrowLeft, Building2, Hash, Lock, Percent, Save, Trash2 } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [aligningRetail, setAligningRetail] = useState(false);
  const [recalculatingGst, setRecalculatingGst] = useState(false);
  const [clearingAccounting, setClearingAccounting] = useState(false);
  const [clearAccountingDate, setClearAccountingDate] = useState(() => new Date().toISOString().slice(0, 10));
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
    printGatePass: true,
    upiAccounts: [],
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
        printGatePass: d.printGatePass !== false,
        upiAccounts: normalizeUpiAccounts(d.upiAccounts),
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
        printGatePass: company.printGatePass !== false,
        upiAccounts: normalizeUpiAccounts(company.upiAccounts),
      });
      setMessage({ type: 'success', text: 'Company details saved successfully.' });
      broadcastDataUpdate();
      window.location.reload();
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

  const handleAlignRetailNumbers = async () => {
    if (aligningRetail) return;
    const ok = window.confirm(
      'This will change every existing retail (shop) bill number to the GST format R/2627/00001, in the order the bills were made.\n\nKeep this window open until it finishes. If the screen turns off, wait 1 minute before clicking again.\n\nDo this only if those bills have not already been filed in GSTR-1 / e-invoice. Printed copies must be reprinted.\n\nB2B invoice numbers are not changed.\n\nContinue?'
    );
    if (!ok) return;
    setAligningRetail(true);
    setMessage({ type: 'success', text: 'Updating bill numbers… keep this window open. Do not click again.' });
    try {
      const res = await invoiceService.alignRetailGstNumbers();
      const updated = res.data?.updated ?? 0;
      const nextPreview = res.data?.nextPreview || '';
      setMessage({
        type: 'success',
        text: updated === 0
          ? `No retail bills to update. Next new bill will be ${nextPreview || 'R/YYYY/00001'}.`
          : `Updated ${updated} retail bill number(s). Next new bill will be ${nextPreview}. Reprint any bill you already gave to a customer.`,
      });
      broadcastDataUpdate();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error
          || (err.code === 'ECONNABORTED'
            ? 'The update is still running on the server. Wait 1 minute, then click once.'
            : 'Failed to update existing retail bill numbers'),
      });
    } finally {
      setAligningRetail(false);
    }
  };

  const handleRecalculateRetailGst = async () => {
    if (recalculatingGst) return;
    const ok = window.confirm(
      'First put every product in the correct category (example: spices 5%, cosmetics 18%).\n\nThis will recompute CGST/SGST on existing retail (shop) bills from each product’s current category.\n\nWhat the customer paid does not change (prices already include GST). B2B bills are not changed.\n\nDo not run if those bills are already filed in GSTR-1. Reprint any bill you already gave to a customer.\n\nContinue?'
    );
    if (!ok) return;
    setRecalculatingGst(true);
    setMessage({ type: 'success', text: 'Recalculating GST… keep this window open.' });
    try {
      const res = await invoiceService.recalculateRetailGst();
      const invoicesUpdated = res.data?.invoicesUpdated ?? 0;
      const itemsUpdated = res.data?.itemsUpdated ?? 0;
      const itemsSkipped = res.data?.itemsSkipped ?? 0;
      setMessage({
        type: 'success',
        text: invoicesUpdated === 0 && itemsUpdated === 0
          ? `No retail bill lines needed a GST change.${itemsSkipped ? ` ${itemsSkipped} line(s) had no product.` : ''}`
          : `Updated GST on ${itemsUpdated} line(s) across ${invoicesUpdated} retail bill(s).${itemsSkipped ? ` Skipped ${itemsSkipped} line(s) with no product.` : ''} GSTR-1 Excel will now use the new 5%/18% split.`,
      });
      broadcastDataUpdate();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error
          || (err.code === 'ECONNABORTED'
            ? 'Timed out. Wait a minute, then click Recalculate GST once.'
            : 'Failed to recalculate GST'),
      });
    } finally {
      setRecalculatingGst(false);
    }
  };

  const handleClearAccountingDay = async () => {
    if (clearingAccounting) return;
    const date = (clearAccountingDate || '').slice(0, 10);
    if (!date) return;
    const ok = window.confirm(
      `Clear typed Accounting & Day Close values for ${date}?\n\nKeeps: system sales (bills) and cash balance.\nEmployee payouts are moved to Staff → employee account.\nDeletes from this page: billing book, payment split, and other expenses.`
    );
    if (!ok) return;
    setClearingAccounting(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await accountingService.clearEntered(date);
      const n = res.data?.otherExpensesCleared ?? 0;
      setMessage({
        type: 'success',
        text: `Cleared day-close entries for ${date}. Moved ${res.data?.staffMoved ?? 0} employee payout(s) to Staff. Other expenses removed: ${n}. System bills were not changed.`,
      });
      broadcastDataUpdate();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to clear accounting entries' });
    } finally {
      setClearingAccounting(false);
    }
  };

  const handleClearAccountingAll = async () => {
    if (clearingAccounting) return;
    const ok = window.confirm(
      'Clear typed Accounting & Day Close values for EVERY date?\n\nKeeps: all system bills and cash balances.\nEmployee payouts are moved to Staff → employee account.\nDeletes from accounting: billing book, payment splits, and other expenses.\n\nThis cannot be undone.'
    );
    if (!ok) return;
    setClearingAccounting(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await accountingService.clearEnteredAll();
      setMessage({
        type: 'success',
        text: `Cleared day-close entries on ${res.data?.daysCleared ?? 0} day(s). Moved ${res.data?.staffMoved ?? 0} employee payout(s) to Staff. Other expenses removed: ${res.data?.otherExpensesCleared ?? 0}. System bills were kept.`,
      });
      broadcastDataUpdate();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to clear accounting entries' });
    } finally {
      setClearingAccounting(false);
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
          <AppUpdateCard />
        </section>
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
                placeholder="fasilpvr52@gmail.com"
              />
              <p className="settings-field-hint">Password reset OTP is sent to fasilpvr52@gmail.com from the login page.</p>
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
            <div className="form-group">
              <label className="settings-checkbox-label">
                <input
                  type="checkbox"
                  checked={company.printGatePass}
                  onChange={(e) => setCompany({ ...company, printGatePass: e.target.checked })}
                />
                Print gate pass along with the invoice
              </label>
              <p className="settings-field-hint">
                When ticked, printing includes the invoice and a gate-pass copy. Untick to print the invoice once.
              </p>
            </div>
            <div className="form-group">
              <label>UPI accounts</label>
              <p className="settings-field-hint">
                Add names like UPI C, UPI S, UPI H. These buttons appear on the billing payment window.
              </p>
              <div className="settings-upi-list">
                {(company.upiAccounts || []).map((acc, idx) => (
                  <div className="settings-upi-row" key={`upi-${idx}`}>
                    <input
                      type="text"
                      value={acc.label}
                      placeholder="UPI C"
                      onChange={(e) => {
                        const next = [...company.upiAccounts];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setCompany({ ...company, upiAccounts: next });
                      }}
                    />
                    <input
                      type="text"
                      value={acc.upiId || ''}
                      placeholder="UPI ID (optional)"
                      onChange={(e) => {
                        const next = [...company.upiAccounts];
                        next[idx] = { ...next[idx], upiId: e.target.value };
                        setCompany({ ...company, upiAccounts: next });
                      }}
                    />
                    <button
                      type="button"
                      className="settings-upi-remove"
                      onClick={() => setCompany({
                        ...company,
                        upiAccounts: company.upiAccounts.filter((_, i) => i !== idx),
                      })}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="settings-upi-remove"
                onClick={() => setCompany({
                  ...company,
                  upiAccounts: [...(company.upiAccounts || []), { label: '', upiId: '' }],
                })}
              >
                + Add UPI account
              </button>
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={savingCompany}>
                <Save size={18} /> {savingCompany ? 'Saving...' : 'Save Company Details'}
              </button>
            </div>
          </form>
        </section>

        <section className="settings-section">
          <h2><Hash size={20} /> Retail bill numbers (GST)</h2>
          <p className="settings-field-hint">
            New shop bills use GST Rule 46 serials, for example <strong>R/2627/00001</strong>
            (series / financial year / consecutive number, 12 characters).
            The series restarts on 1 April each year. Cancelled bills keep their number.
          </p>
          <p className="settings-field-hint" style={{ marginTop: 12 }}>
            Bills you already saved still have the old <strong>INV-date-…</strong> numbers until you convert them.
            Use this once, then reprint those bills. Do not convert bills already uploaded in a GST return.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="submit-btn"
              disabled={aligningRetail}
              onClick={handleAlignRetailNumbers}
            >
              <Hash size={18} /> {aligningRetail ? 'Updating bill numbers…' : 'Convert existing retail bills to GST numbers'}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2><Percent size={20} /> Recalculate GST on retail bills</h2>
          <p className="settings-field-hint">
            If a spice was billed at <strong>18%</strong> because it was in the wrong category, first move it to the
            <strong> 5%</strong> spices category in Product Management. Then use this button.
            Shop bills keep the same total (GST is inside the price); only CGST/SGST and taxable value are corrected.
            B2B invoices are not changed.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="submit-btn"
              disabled={recalculatingGst}
              onClick={handleRecalculateRetailGst}
            >
              <Percent size={18} /> {recalculatingGst ? 'Recalculating GST…' : 'Recalculate GST from product categories'}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2><Trash2 size={20} /> Clear Accounting &amp; Day Close entries</h2>
          <p className="settings-field-hint">
            Removes values you typed on Accounting &amp; Day Close: billing book, card/UPI payment split, and
            other expenses, payment split, and the balance check. <strong>System bill totals stay.</strong> Employee payouts are moved to
            <strong>Staff → employee account</strong>. Cash balance stays. The accounting page then shows only system sales and cash.
          </p>
          <div className="form-group" style={{ marginTop: 12, maxWidth: 280 }}>
            <label>Date</label>
            <input
              type="date"
              value={clearAccountingDate}
              onChange={(e) => setClearAccountingDate(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="submit-btn"
              disabled={clearingAccounting}
              onClick={handleClearAccountingDay}
            >
              <Trash2 size={18} /> {clearingAccounting ? 'Clearing…' : 'Clear this date'}
            </button>
            <button
              type="button"
              className="back-button"
              disabled={clearingAccounting}
              onClick={handleClearAccountingAll}
            >
              Clear all dates
            </button>
          </div>
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
