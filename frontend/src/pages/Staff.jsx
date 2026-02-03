import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { employeeService, fileUploadService, employeeAccountService, expenseService, attendanceService } from '../services/api';
import { Plus, Edit, Trash2, ArrowLeft, UserCircle, Upload, FileText, Image, Wallet } from 'lucide-react';

const getPhotoUrl = (path) => {
  if (!path || !path.trim()) return null;
  if (path.startsWith('http')) return path;
  const base = (api.defaults.baseURL || '').replace(/\/api\/?$/, '') || window.location.origin;
  return `${base}/uploads/${path.replace(/^\//, '')}`;
};

const Staff = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState({
    employeeName: '',
    role: 'CASHIER',
    phone: '',
    address: '',
    aadharDocument: '',
    photo: ''
  });
  const [uploadingAadhar, setUploadingAadhar] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [accountEmployee, setAccountEmployee] = useState(null);
  const [advances, setAdvances] = useState([]);
  const [advancesLoading, setAdvancesLoading] = useState(false);
  const [employeeExpenses, setEmployeeExpenses] = useState([]);
  const [employeeExpensesLoading, setEmployeeExpensesLoading] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ amount: '', paymentMethod: 'CASH', recordDate: new Date().toISOString().slice(0, 10) });
  const [advanceSaving, setAdvanceSaving] = useState(false);
  const [accountMonth, setAccountMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [salaryInput, setSalaryInput] = useState('');
  const [clearances, setClearances] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ presentDays: 0, halfDays: 0, absentDays: 0 });
  const [attendanceReportLoading, setAttendanceReportLoading] = useState(false);
  const [saveAccountLoading, setSaveAccountLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), remark: '' });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const navigate = useNavigate();

  const fetchEmployees = async () => {
    try {
      const response = await employeeService.getAll();
      if (Array.isArray(response.data)) {
        setEmployees(response.data);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Failed to fetch employees', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const name = (currentEmployee.employeeName || '').trim();
    if (!name) {
      alert('Name is required.');
      return;
    }
    try {
      const payload = {
        employeeName: name,
        role: currentEmployee.role || 'CASHIER',
        phone: (currentEmployee.phone || '').trim() || null,
        address: (currentEmployee.address || '').trim() || null,
        aadharDocument: currentEmployee.aadharDocument || null,
        photo: currentEmployee.photo || null
      };
      if (currentEmployee.employeeId) {
        payload.employeeCode = currentEmployee.employeeCode;
        payload.email = currentEmployee.email || null;
        await employeeService.update(currentEmployee.employeeId, payload);
      } else {
        await employeeService.create(payload);
      }
      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save employee');
    }
  };

  const handleAadharChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAadhar(true);
    try {
      const res = await fileUploadService.uploadEmployeeAadhar(file);
      const url = res.data?.url ?? res.data?.path;
      if (url) setCurrentEmployee(prev => ({ ...prev, aadharDocument: url }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload Aadhaar document. Use PDF or JPG.');
    } finally {
      setUploadingAadhar(false);
      e.target.value = '';
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const res = await fileUploadService.uploadEmployeePhoto(file);
      const url = res.data?.url ?? res.data?.path;
      if (url) setCurrentEmployee(prev => ({ ...prev, photo: url }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload photo. Use an image file.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const openAdd = () => {
    setCurrentEmployee({ employeeName: '', role: 'CASHIER', phone: '', address: '', aadharDocument: '', photo: '' });
    setShowModal(true);
  };

  const openEdit = (emp) => {
    setCurrentEmployee({
      employeeId: emp.employeeId,
      employeeName: emp.employeeName || '',
      employeeCode: emp.employeeCode || '',
      role: emp.role || 'CASHIER',
      phone: emp.phone || '',
      address: emp.address || '',
      email: emp.email || '',
      aadharDocument: emp.aadharDocument || '',
      photo: emp.photo || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Delete employee "${emp.employeeName || 'this staff'}"? This cannot be undone.`)) return;
    try {
      await employeeService.delete(emp.employeeId);
      await fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete employee.');
    }
  };

  const openAccount = async (emp) => {
    const d = new Date();
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setAccountEmployee(emp);
    setAccountMonth(monthStr);
    setSalaryInput('');
    setAdvances([]);
    setEmployeeExpenses([]);
    setClearances([]);
    setPayments([]);
    setAttendanceStats({ presentDays: 0, halfDays: 0, absentDays: 0 });
    setAdvanceForm({ amount: '', paymentMethod: 'CASH', recordDate: new Date().toISOString().slice(0, 10) });
    setPaymentForm({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), remark: '' });
    setAdvancesLoading(true);
    setEmployeeExpensesLoading(true);
    setAttendanceReportLoading(true);
    try {
      const res = await employeeAccountService.getAdvances(emp.employeeId);
      setAdvances(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch advances', err);
      setAdvances([]);
    } finally {
      setAdvancesLoading(false);
    }
    try {
      const expRes = await expenseService.getByEmployee(emp.employeeId);
      setEmployeeExpenses(Array.isArray(expRes.data) ? expRes.data : []);
    } catch (err) {
      console.error('Failed to fetch employee expenses', err);
      setEmployeeExpenses([]);
    } finally {
      setEmployeeExpensesLoading(false);
    }
    try {
      const [year, month] = monthStr.split('-').map(Number);
      const attRes = await attendanceService.getMonthly(year, month);
      const stats = attRes?.data?.employeeStats || [];
      const empStat = stats.find((s) => s.employeeId === emp.employeeId);
      setAttendanceStats({
        presentDays: empStat?.presentDays ?? 0,
        halfDays: empStat?.halfDays ?? 0,
        absentDays: empStat?.absentDays ?? 0
      });
    } catch (err) {
      console.error('Failed to fetch attendance', err);
      setAttendanceStats({ presentDays: 0, halfDays: 0, absentDays: 0 });
    } finally {
      setAttendanceReportLoading(false);
    }
    try {
      const payRes = await employeeAccountService.getPayments(emp.employeeId);
      setPayments(Array.isArray(payRes.data) ? payRes.data : []);
    } catch (err) {
      console.error('Failed to fetch payments', err);
      setPayments([]);
    }
    try {
      const clearRes = await employeeAccountService.getSalaryClearances(emp.employeeId);
      const list = Array.isArray(clearRes.data) ? clearRes.data : [];
      setClearances(list);
    } catch (err) {
      console.error('Failed to fetch clearances', err);
      setClearances([]);
    }
  };

  const closeAccount = () => setAccountEmployee(null);

  // When account month changes (or clearances load), refresh attendance and salary for that month
  useEffect(() => {
    if (!accountEmployee || !accountMonth) return;
    const [year, month] = accountMonth.split('-').map(Number);
    setAttendanceReportLoading(true);
    attendanceService.getMonthly(year, month)
      .then((attRes) => {
        const stats = attRes?.data?.employeeStats || [];
        const empStat = stats.find((s) => s.employeeId === accountEmployee.employeeId);
        setAttendanceStats({
          presentDays: empStat?.presentDays ?? 0,
          halfDays: empStat?.halfDays ?? 0,
          absentDays: empStat?.absentDays ?? 0
        });
      })
      .catch(() => setAttendanceStats({ presentDays: 0, halfDays: 0, absentDays: 0 }))
      .finally(() => setAttendanceReportLoading(false));
  }, [accountMonth, accountEmployee?.employeeId]);

  // Each month has its own salary: when month or clearances change, set salary from that month's clearance
  useEffect(() => {
    if (!accountMonth || !clearances.length) {
      if (!accountMonth) return;
      setSalaryInput('');
      return;
    }
    const clearanceForMonth = clearances.find((c) => c.salaryMonth === accountMonth);
    setSalaryInput(clearanceForMonth != null && clearanceForMonth.salaryAmount != null
      ? String(clearanceForMonth.salaryAmount)
      : '');
  }, [accountMonth, clearances]);

  const advancesForMonth = advances.filter((a) => {
    const d = a.recordDate ? String(a.recordDate).slice(0, 10) : '';
    return d.startsWith(accountMonth);
  });
  const expensesForMonth = employeeExpenses.filter((e) => {
    const d = e.expenseDate ? String(e.expenseDate).slice(0, 10) : '';
    return d.startsWith(accountMonth);
  });
  const advancesTotalMonth = advancesForMonth.reduce((s, a) => s + Number(a.amount || 0), 0);
  const expensesTotalMonth = expensesForMonth.reduce((s, ex) => s + Number(ex.amount || 0), 0);
  const totalDeductions = advancesTotalMonth + expensesTotalMonth;
  const salaryNum = parseFloat(salaryInput) || 0;
  const balance = salaryNum - totalDeductions; // can be negative (employee owes us)
  // Payments given for this settlement: same month or next month (e.g. paid at start of next month)
  const [accYear, accMon] = accountMonth.split('-').map(Number);
  const nextMon = accMon === 12 ? 1 : accMon + 1;
  const nextYear = accMon === 12 ? accYear + 1 : accYear;
  const nextMonthStr = `${nextYear}-${String(nextMon).padStart(2, '0')}`;
  const paymentsForSettlement = payments.filter((p) => {
    const d = p.paymentDate ? String(p.paymentDate).slice(0, 7) : '';
    return d === accountMonth || d === nextMonthStr;
  });
  const totalPaymentsGiven = paymentsForSettlement.reduce((s, p) => s + Number(p.amount || 0), 0);
  const [accY, accM] = accountMonth.split('-').map(Number);
  const prevMon = accM === 1 ? 12 : accM - 1;
  const prevYear = accM === 1 ? accY - 1 : accY;
  const prevMonthStr = `${prevYear}-${String(prevMon).padStart(2, '0')}`;
  const prevMonthClearance = clearances.find((c) => c.salaryMonth === prevMonthStr);
  const prevMonthBalance = prevMonthClearance?.closingBalance != null ? parseFloat(prevMonthClearance.closingBalance) : 0;
  // Balance at month end = previous month balance + (salary − deductions) − amount given
  const balanceToGive = prevMonthBalance + balance - totalPaymentsGiven; // negative = employee owes us

  const ledgerEntries = [
    ...expensesForMonth.map((ex) => ({ type: 'Expense', date: ex.expenseDate, amount: ex.amount, id: `ex-${ex.expenseId}`, key: ex.expenseId })),
    ...advancesForMonth.map((a) => ({ type: 'Advance', date: a.recordDate, amount: a.amount, id: `adv-${a.advanceId}`, advanceId: a.advanceId, key: a.advanceId })),
    ...paymentsForSettlement.map((p) => ({ type: 'Amount given', date: p.paymentDate, amount: p.amount, id: `pay-${p.paymentId}`, paymentId: p.paymentId, key: p.paymentId })),
  ].sort((a, b) => {
    const dA = (a.date && String(a.date).slice(0, 10)) || '';
    const dB = (b.date && String(b.date).slice(0, 10)) || '';
    return dA.localeCompare(dB);
  });

  const handleSaveAccount = async () => {
    if (!accountEmployee) return;
    const sal = parseFloat(salaryInput);
    if (!Number.isFinite(sal) || sal < 0) {
      alert('Enter a valid salary amount (0 or more).');
      return;
    }
    setSaveAccountLoading(true);
    try {
      await employeeAccountService.saveMonthDetails({
        employeeId: accountEmployee.employeeId,
        month: accountMonth,
        salaryAmount: sal,
        totalTaken: totalDeductions,
        totalPaymentsGiven,
      });
      const res = await employeeAccountService.getSalaryClearances(accountEmployee.employeeId);
      setClearances(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save account details.');
    } finally {
      setSaveAccountLoading(false);
    }
  };

  const handleDeleteAdvance = async (advanceId) => {
    if (!accountEmployee || !window.confirm('Remove this advance?')) return;
    try {
      await employeeAccountService.deleteAdvance(advanceId);
      const res = await employeeAccountService.getAdvances(accountEmployee.employeeId);
      setAdvances(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete advance.');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!accountEmployee || !window.confirm('Remove this amount given?')) return;
    try {
      await employeeAccountService.deletePayment(paymentId);
      const res = await employeeAccountService.getPayments(accountEmployee.employeeId);
      setPayments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete payment.');
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!accountEmployee) return;
    const amount = parseFloat(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a valid amount.');
      return;
    }
    setPaymentSaving(true);
    try {
      await employeeAccountService.addPayment({
        employeeId: accountEmployee.employeeId,
        amount,
        paymentDate: paymentForm.paymentDate || new Date().toISOString().slice(0, 10),
        remark: (paymentForm.remark || '').trim() || null
      });
      const res = await employeeAccountService.getPayments(accountEmployee.employeeId);
      setPayments(Array.isArray(res.data) ? res.data : []);
      setPaymentForm({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), remark: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add payment.');
    } finally {
      setPaymentSaving(false);
    }
  };

  const formatPaymentDate = (d) => {
    if (!d) return '–';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '–' : dt.toLocaleDateString();
  };

  const handleAddAdvance = async (e) => {
    e.preventDefault();
    if (!accountEmployee) return;
    const amount = parseFloat(advanceForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a valid amount.');
      return;
    }
    setAdvanceSaving(true);
    try {
      await employeeAccountService.createAdvance({
        employeeId: accountEmployee.employeeId,
        amount,
        paymentMethod: advanceForm.paymentMethod || 'CASH',
        recordDate: advanceForm.recordDate || new Date().toISOString().slice(0, 10)
      });
      const res = await employeeAccountService.getAdvances(accountEmployee.employeeId);
      setAdvances(Array.isArray(res.data) ? res.data : []);
      setAdvanceForm({ amount: '', paymentMethod: advanceForm.paymentMethod, recordDate: new Date().toISOString().slice(0, 10) });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add amount.');
    } finally {
      setAdvanceSaving(false);
    }
  };

  const formatAdvanceDate = (d) => {
    if (!d) return '–';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '–' : dt.toLocaleDateString();
  };

  const formatExpenseDate = (d) => {
    if (!d) return '–';
    const s = typeof d === 'string' ? d.slice(0, 10) : d;
    const dt = new Date(s + (s.length === 10 ? 'T12:00:00' : ''));
    return isNaN(dt.getTime()) ? '–' : dt.toLocaleDateString();
  };

  return (
    <div className="employees-container">
      <div className="employees-header">
        <div>
          <h1>👥 Staff Management</h1>
          <p>Manage employee profiles and roles</p>
        </div>
        <div className="header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
          <button className="add-button" onClick={openAdd}>
            <Plus size={18} /> Add Staff
          </button>
        </div>
      </div>

      <div className="employees-table-container">
        <table className="employees-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Code</th>
              <th>Mobile</th>
              <th>Address</th>
              <th>Aadhaar</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="loading">Loading staff...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan="7" className="no-data">No employees found</td></tr>
            ) : employees.map(emp => (
              <tr key={emp.employeeId}>
                <td className="employee-photo-cell">
                  {emp.photo ? (
                    <img
                      src={getPhotoUrl(emp.photo)}
                      alt={emp.employeeName ? `${emp.employeeName} photo` : 'Employee'}
                      className="employee-photo-thumb"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('employee-photo-fallback-hidden'); }}
                    />
                  ) : null}
                  {emp.photo ? (
                    <span className="employee-photo-fallback employee-photo-fallback-hidden" aria-hidden="true">
                      <UserCircle size={32} />
                    </span>
                  ) : (
                    <span className="employee-photo-fallback"><UserCircle size={32} /></span>
                  )}
                </td>
                <td>
                  <div className="employee-name-cell">
                    <span>{emp.employeeName}</span>
                  </div>
                </td>
                <td>{emp.employeeCode || '–'}</td>
                <td className="employee-mobile-cell">{emp.phone || '–'}</td>
                <td className="employee-address-cell">{emp.address || '–'}</td>
                <td>{emp.aadharDocument ? <span className="file-badge"><FileText size={14} /> Uploaded</span> : '–'}</td>
                <td className="action-buttons">
                  <button className="account-btn" title="Account – add money taken" onClick={() => openAccount(emp)}>
                    <Wallet size={16} />
                  </button>
                  <button className="edit-btn" title="Edit" onClick={() => openEdit(emp)}>
                    <Edit size={16} />
                  </button>
                  <button className="remove-btn" title="Delete" onClick={() => handleDelete(emp)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Account modal – employee account */}
      {accountEmployee && (
        <div className="modal-overlay" onClick={closeAccount}>
          <div className="modal-content staff-account-modal" onClick={e => e.stopPropagation()}>
            <div className="staff-account-modal-header">
              <h2>Employee Account</h2>
              <button type="button" className="staff-account-close" onClick={closeAccount} aria-label="Close">×</button>
            </div>
            <div className="staff-account-employee-name">{accountEmployee.employeeName || 'Employee'}</div>
            <div className="staff-account-modal-body">
              <div className="staff-account-row staff-account-month-row">
                <label className="staff-account-label">Month</label>
                <input
                  type="month"
                  value={accountMonth}
                  onChange={(e) => setAccountMonth(e.target.value || accountMonth)}
                  className="staff-account-input staff-account-month-input"
                />
              </div>

              {/* Single table: Expense + Advance + Amount given */}
              <section className="staff-account-section staff-account-list-section">
                <h3 className="staff-account-section-title">Expenses, Advance &amp; Amount given</h3>
                {(employeeExpensesLoading || advancesLoading) ? (
                  <p className="staff-account-empty">Loading…</p>
                ) : ledgerEntries.length === 0 ? (
                  <p className="staff-account-empty">No entries this month.</p>
                ) : (
                  <>
                    <table className="staff-account-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Amount (₹)</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerEntries.map((row) => (
                          <tr key={row.id}>
                            <td>{row.date ? (row.type === 'Amount given' ? formatPaymentDate(row.date) : row.type === 'Advance' ? formatAdvanceDate(row.date) : formatExpenseDate(row.date)) : '–'}</td>
                            <td>{row.type}</td>
                            <td>{Number(row.amount || 0).toFixed(2)}</td>
                            <td>
                              {row.type === 'Advance' && row.advanceId != null && (
                                <button type="button" className="staff-account-delete-btn" onClick={() => handleDeleteAdvance(row.advanceId)} title="Delete advance">
                                  <Trash2 size={14} /> Delete
                                </button>
                              )}
                              {row.type === 'Amount given' && row.paymentId != null && (
                                <button type="button" className="staff-account-delete-btn" onClick={() => handleDeletePayment(row.paymentId)} title="Delete amount given">
                                  <Trash2 size={14} /> Delete
                                </button>
                              )}
                              {row.type === 'Expense' && '–'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="staff-account-total">Deductions (expense + advance): ₹ {totalDeductions.toFixed(2)} · Amount given: ₹ {totalPaymentsGiven.toFixed(2)}</p>
                  </>
                )}
                <div className="staff-account-add-advance">
                  <form onSubmit={handleAddAdvance} className="staff-account-advance-form">
                    <div className="staff-account-fields">
                      <div className="staff-account-field">
                        <label>Add advance – Amount (₹) <span className="required">*</span></label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={advanceForm.amount}
                          onChange={e => setAdvanceForm(f => ({ ...f, amount: e.target.value }))}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div className="staff-account-field">
                        <label>Date</label>
                        <input
                          type="date"
                          value={advanceForm.recordDate}
                          onChange={e => setAdvanceForm(f => ({ ...f, recordDate: e.target.value }))}
                        />
                      </div>
                      <div className="staff-account-field staff-account-field-action">
                        <label>&nbsp;</label>
                        <button type="submit" className="staff-account-btn staff-account-btn-primary" disabled={advanceSaving}>
                          {advanceSaving ? 'Adding…' : 'Add advance'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </section>

              {/* Total days attendance */}
              <section className="staff-account-section staff-account-attendance-section">
                <h3 className="staff-account-section-title">Total days attendance</h3>
                <div className="staff-account-attendance-row">
                  {attendanceReportLoading ? (
                    <span>…</span>
                  ) : (
                    <>
                      <span>Present: <strong>{attendanceStats.presentDays}</strong></span>
                      <span>Half day: <strong>{attendanceStats.halfDays}</strong></span>
                      <span>Absent: <strong>{attendanceStats.absentDays}</strong></span>
                    </>
                  )}
                </div>
              </section>

              {/* Salary */}
              <section className="staff-account-section staff-account-salary-section">
                <h3 className="staff-account-section-title">Salary</h3>
                <div className="staff-account-row staff-salary-input-row">
                  <label className="staff-account-label">Salary (₹)</label>
                  <div className="staff-salary-input-wrap">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salaryInput}
                      onChange={(e) => setSalaryInput(e.target.value)}
                      placeholder="0.00"
                      className="staff-account-input staff-salary-input"
                    />
                  </div>
                </div>
              </section>

              {/* Settlement */}
              <section className="staff-account-section staff-account-summary-section">
                <h3 className="staff-account-section-title">Settlement</h3>
                <div className="staff-account-summary-box">
                  {prevMonthClearance && (
                    <div className={`staff-account-summary-row staff-account-summary-prev ${(prevMonthBalance ?? 0) >= 0 ? '' : 'staff-account-negative'}`}>
                      <span>Previous month balance</span>
                      <span>₹ {(prevMonthBalance ?? 0).toFixed(2)}{(prevMonthBalance ?? 0) === 0 ? ' (tally)' : (prevMonthBalance ?? 0) < 0 ? ' (employee owes)' : ' (to give employee)'}</span>
                    </div>
                  )}
                  <div className="staff-account-summary-row">
                    <span>Deductions (expense + advance this month)</span>
                    <span>₹ {totalDeductions.toFixed(2)}</span>
                  </div>
                  <div className={`staff-account-summary-row staff-account-summary-highlight ${balance < 0 ? 'staff-account-negative' : ''}`}>
                    <span>Balance (salary − deductions)</span>
                    <span>₹ {balance.toFixed(2)}{balance < 0 ? ' (employee owes employer)' : ''}</span>
                  </div>
                  <div className={`staff-account-summary-row staff-account-summary-highlight staff-account-balance-to-give ${balanceToGive < 0 ? 'staff-account-negative' : ''}`}>
                    <span>Balance at month end</span>
                    <span>₹ {balanceToGive.toFixed(2)}{balanceToGive < 0 ? ' (employee owes employer)' : ' (employer to give employee)'}</span>
                  </div>
                </div>
                <div className="staff-account-actions">
                  <button type="button" className="staff-account-btn staff-account-btn-save" onClick={handleSaveAccount} disabled={saveAccountLoading}>
                    {saveAccountLoading ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content staff-modal-content">
            <div className="modal-header">
              <h2>{currentEmployee.employeeId ? 'Edit Staff' : 'Add New Staff'}</h2>
              <button type="button" className="close-btn" onClick={() => setShowModal(false)} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleSave} className="employee-form">
              <div className="employee-form-grid">
                <div className="form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={currentEmployee.employeeName}
                    onChange={e => setCurrentEmployee({ ...currentEmployee, employeeName: e.target.value })}
                    placeholder="Staff name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={currentEmployee.role || 'CASHIER'}
                    onChange={e => setCurrentEmployee({ ...currentEmployee, role: e.target.value })}
                  >
                    <option value="CASHIER">Cashier</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Mobile</label>
                  <input
                    type="tel"
                    value={currentEmployee.phone || ''}
                    onChange={e => setCurrentEmployee({ ...currentEmployee, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="form-group form-group-full">
                  <label>Address</label>
                  <textarea
                    value={currentEmployee.address || ''}
                    onChange={e => setCurrentEmployee({ ...currentEmployee, address: e.target.value })}
                    placeholder="Full address"
                    rows={2}
                  />
                </div>
                <div className="form-group form-group-full">
                  <label>Aadhaar (photo or PDF)</label>
                  <div className="file-upload-row">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      onChange={handleAadharChange}
                      disabled={uploadingAadhar}
                      className="file-input"
                    />
                    <span className="file-status">
                      {uploadingAadhar ? 'Uploading...' : currentEmployee.aadharDocument ? '✓ Uploaded' : 'Choose file'}
                    </span>
                  </div>
                </div>
                <div className="form-group form-group-full">
                  <label>Photo</label>
                  <div className="file-upload-row">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      disabled={uploadingPhoto}
                      className="file-input"
                    />
                    <span className="file-status">
                      {uploadingPhoto ? 'Uploading...' : currentEmployee.photo ? '✓ Uploaded' : 'Choose image'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">{currentEmployee.employeeId ? 'Update Staff' : 'Save Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
