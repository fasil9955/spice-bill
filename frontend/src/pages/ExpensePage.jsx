import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseService, employeeService, expenseCategoryService } from '../services/api';
import { ArrowLeft, TrendingUp, Pencil, Trash2, X } from 'lucide-react';
import './ExpensePage.css';

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'Upi' },
];

const formatPaymentMethod = (pm) => {
  if (!pm) return 'Cash';
  const found = PAYMENT_METHODS.find((p) => p.value === pm);
  return found ? found.label : pm.charAt(0) + pm.slice(1).toLowerCase();
};

const formatTime = (createdAt) => {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const CREATE_NEW_VALUE = 'CREATE_NEW';
const EMPLOYEE_VALUE = 'EMPLOYEE';

const ExpensePage = () => {
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const [selectedType, setSelectedType] = useState(EMPLOYEE_VALUE); // 'CREATE_NEW' | 'EMPLOYEE' | String(categoryId)
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    accountType: 'EMPLOYEE',
    employeeId: '',
    otherName: '',
    amount: '0.00',
    paymentMethod: 'CASH',
    expenseDate: getTodayDateString(),
  });
  const navigate = useNavigate();

  const totalAmount = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await expenseService.getByDate(selectedDate);
      const list = Array.isArray(res.data) ? res.data : [];
      setExpenses(list);
    } catch (err) {
      console.error('Failed to fetch expenses', err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeeService.getAll();
      const list = Array.isArray(res.data) ? res.data : [];
      setEmployees(list);
    } catch (err) {
      console.error('Failed to fetch employees', err);
      setEmployees([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await expenseCategoryService.getAll();
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch categories', err);
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedDate]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedType === EMPLOYEE_VALUE) {
      setForm((f) => ({ ...f, accountType: 'EMPLOYEE', otherName: '' }));
    } else if (selectedType !== CREATE_NEW_VALUE && selectedType !== '') {
      const cat = categories.find((c) => String(c.id) === String(selectedType));
      if (cat) setForm((f) => ({ ...f, accountType: 'OTHER', otherName: cat.name }));
    }
  }, [selectedType, categories]);

  const employeeMap = employees.reduce((acc, e) => {
    const id = e.employeeId ?? e.id;
    acc[id] = e.employeeName || e.name || `Employee #${id}`;
    return acc;
  }, {});

  const resetAddForm = () => {
    setForm({
      accountType: selectedType === EMPLOYEE_VALUE ? 'EMPLOYEE' : 'OTHER',
      employeeId: '',
      otherName: selectedType !== EMPLOYEE_VALUE && selectedType !== CREATE_NEW_VALUE && selectedType !== '' ? (categories.find((c) => String(c.id) === String(selectedType))?.name || '') : '',
      amount: '0.00',
      paymentMethod: 'CASH',
      expenseDate: selectedDate || getTodayDateString(),
    });
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const name = (newCategoryName || '').trim();
    if (!name) return;
    setSavingCategory(true);
    try {
      const res = await expenseCategoryService.create({ name });
      const created = res?.data;
      await fetchCategories();
      if (created?.id != null) setSelectedType(String(created.id));
      setNewCategoryName('');
    } catch (err) {
      console.error('Create category failed', err);
      alert(err.response?.data?.error || 'Failed to create category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category? Existing expenses with this type will keep the name.')) return;
    setDeletingCategoryId(id);
    try {
      await expenseCategoryService.delete(id);
      await fetchCategories();
      if (String(selectedType) === String(id)) setSelectedType(EMPLOYEE_VALUE);
    } catch (err) {
      console.error('Delete category failed', err);
      alert(err.response?.data?.error || 'Failed to delete category');
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const openEdit = (record) => {
    setEditingId(record.expenseId);
    setForm({
      accountType: record.accountType || 'OTHER',
      employeeId: record.employeeId ?? '',
      otherName: record.otherName || '',
      amount: record.amount != null ? String(record.amount) : '',
      paymentMethod: record.paymentMethod || 'CASH',
      expenseDate: record.expenseDate ? record.expenseDate.slice(0, 10) : getTodayDateString(),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!editingId || !Number.isFinite(amount) || amount <= 0) return;
    if (form.accountType === 'EMPLOYEE') {
      if (!form.employeeId) return;
    } else {
      if (!(form.otherName || '').trim()) return;
    }
    setSubmitting(true);
    try {
      await expenseService.update(editingId, {
        accountType: form.accountType,
        employeeId: form.accountType === 'EMPLOYEE' ? parseInt(form.employeeId, 10) : null,
        otherName: form.accountType === 'OTHER' ? (form.otherName || '').trim() : null,
        amount,
        paymentMethod: form.paymentMethod || 'CASH',
        expenseDate: form.expenseDate || getTodayDateString(),
      });
      closeModal();
      await fetchExpenses();
    } catch (err) {
      console.error('Update failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Remove this expense?`)) return;
    try {
      await expenseService.delete(record.expenseId);
      await fetchExpenses();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const isToday = selectedDate === getTodayDateString();
  const isEmployeeType = selectedType === EMPLOYEE_VALUE;
  const isCreateNew = selectedType === CREATE_NEW_VALUE;
  const selectedCategory = categories.find((c) => String(c.id) === String(selectedType));

  const renderAddForm = () => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isCreateNew) return;
        const amount = parseFloat(form.amount);
        if (!Number.isFinite(amount) || amount <= 0) return;
        if (isEmployeeType) {
          if (!form.employeeId) return;
        } else if (selectedCategory) {
          // category selected – use category name as otherName
        } else {
          return;
        }
        setSubmitting(true);
        expenseService
          .create({
            accountType: isEmployeeType ? 'EMPLOYEE' : 'OTHER',
            employeeId: isEmployeeType ? parseInt(form.employeeId, 10) : null,
            otherName: !isEmployeeType && selectedCategory ? selectedCategory.name : (isEmployeeType ? null : (form.otherName || '').trim() || null),
            amount,
            paymentMethod: form.paymentMethod || 'CASH',
            expenseDate: form.expenseDate || selectedDate || getTodayDateString(),
          })
          .then(() => {
            resetAddForm();
            return fetchExpenses();
          })
          .catch((err) => console.error('Expense save failed', err))
          .finally(() => setSubmitting(false));
      }}
    >
      <div className="expense-form-grid">
        <div className="expense-form-field expense-form-field-type">
          <label>Expense type:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value={CREATE_NEW_VALUE}>+ Create new category</option>
            <option value={EMPLOYEE_VALUE}>Employee</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
        {isCreateNew && (
          <div className="expense-create-category-row">
            <input
              type="text"
              placeholder="New category name (e.g. Pigmi, Vegetable, Current bill)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="expense-new-category-input"
            />
            <button type="button" className="expense-add-btn" onClick={handleCreateCategory} disabled={savingCategory || !(newCategoryName || '').trim()}>
              {savingCategory ? 'Saving…' : 'Save category'}
            </button>
          </div>
        )}
        {!isCreateNew && isEmployeeType && (
          <div className="expense-form-field">
            <label>Employee:</label>
            <select
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              required
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => {
                const id = emp.employeeId ?? emp.id;
                return (
                  <option key={id} value={id}>
                    {emp.employeeName || emp.name || `Employee #${id}`}
                  </option>
                );
              })}
            </select>
          </div>
        )}
        {!isCreateNew && (
          <>
            <div className="expense-form-field">
              <label>Amount (₹):</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="expense-form-field">
              <label>Payment Method:</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>{pm.label}</option>
                ))}
              </select>
            </div>
            <div className="expense-form-field">
              <label>Date:</label>
              <input
                type="date"
                value={form.expenseDate || selectedDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
              />
            </div>
          </>
        )}
      </div>
      {!isCreateNew && (
        <div className="expense-form-actions">
          <button type="submit" className="expense-add-btn" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Expense'}
          </button>
        </div>
      )}
    </form>
  );

  const renderTable = () => (
    <div className="expense-list-table-wrap">
      <table className="expense-list-table">
        <thead>
          <tr>
            <th>TIME</th>
            <th>TYPE</th>
            <th>NAME</th>
            <th>AMOUNT</th>
            <th>PAYMENT</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="6" className="expense-loading">Loading…</td>
            </tr>
          ) : expenses.length === 0 ? (
            <tr>
              <td colSpan="6" className="expense-no-data">No expenses for this date.</td>
            </tr>
          ) : (
            expenses.map((exp) => (
              <tr key={exp.expenseId}>
                <td>{formatTime(exp.createdAt)}</td>
                <td>{exp.accountType === 'EMPLOYEE' ? 'Employee' : (exp.otherName || '—')}</td>
                <td>{exp.accountType === 'EMPLOYEE' ? (employeeMap[exp.employeeId] || `#${exp.employeeId}`) : '—'}</td>
                <td>₹{(parseFloat(exp.amount) || 0).toFixed(2)}</td>
                <td>{formatPaymentMethod(exp.paymentMethod)}</td>
                <td>
                  <div className="expense-list-actions">
                    <button type="button" className="expense-edit-btn" onClick={() => openEdit(exp)}>Edit</button>
                    <button type="button" className="expense-remove-btn" onClick={() => handleDelete(exp)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))
          )}
          {!loading && expenses.length > 0 && (
            <tr className="expense-total-row">
              <td colSpan="3">Total</td>
              <td>₹{totalAmount.toFixed(2)}</td>
              <td colSpan="2" />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="expense-page">
      <div className="expense-header">
        <div className="expense-header-left">
          <div className="expense-header-icon">
            <TrendingUp size={28} />
          </div>
          <div>
            <h1>Expenses</h1>
            <p className="expense-header-subtitle">Add by type: Employee, Pigmi, Vegetable, Current bill, or create new</p>
          </div>
        </div>
        <button type="button" className="expense-dashboard-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} /> Dashboard
        </button>
      </div>

      <div className="expense-date-filter">
        <label htmlFor="expense-date">Date</label>
        <input
          id="expense-date"
          type="date"
          value={selectedDate || ''}
          onChange={(e) => setSelectedDate(e.target.value || getTodayDateString())}
        />
      </div>

      <div className="expense-summary-cards">
        <div className="expense-summary-card">
          <p className="expense-summary-card-label">
            TOTAL EXPENSES {isToday ? 'TODAY' : `(${selectedDate})`}
          </p>
          <p className="expense-summary-card-value">₹{totalAmount.toFixed(2)}</p>
        </div>
        <div className="expense-summary-card">
          <p className="expense-summary-card-label">NUMBER OF EXPENSES</p>
          <p className="expense-summary-card-value">{expenses.length}</p>
        </div>
      </div>

      <div className="expense-form-card">
        <h2>Add Expense</h2>
        {renderAddForm()}
      </div>

      <div className="expense-manage-categories">
        <button type="button" className="expense-manage-toggle" onClick={() => setShowManageCategories((s) => !s)}>
          {showManageCategories ? 'Hide' : 'Manage categories'}
        </button>
        {showManageCategories && (
          <div className="expense-categories-list">
            {categories.length === 0 ? (
              <p className="expense-no-data">No custom categories yet. Use &quot;+ Create new category&quot; above.</p>
            ) : (
              <ul>
                {categories.map((c) => (
                  <li key={c.id}>
                    <span>{c.name}</span>
                    <button type="button" className="expense-remove-btn" onClick={() => handleDeleteCategory(c.id)} disabled={deletingCategoryId === c.id}>
                      {deletingCategoryId === c.id ? '…' : 'Delete'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="expense-list-card">
        <h2>Expense List</h2>
        {renderTable()}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content bills-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bills-detail-header">
              <h2>Edit Expense</h2>
              <button type="button" className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="bills-detail-body">
              <div className="bills-edit-row">
                <label>Account Type</label>
                <select
                  className="bills-edit-select"
                  value={form.accountType}
                  onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                >
                  <option value="OTHER">Other</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
              </div>
              {form.accountType === 'EMPLOYEE' ? (
                <div className="bills-edit-row">
                  <label>Employee</label>
                  <select
                    className="bills-edit-select"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => {
                      const id = emp.employeeId ?? emp.id;
                      return (
                        <option key={id} value={id}>
                          {emp.employeeName || emp.name || `Employee #${id}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="bills-edit-row">
                  <label>Name / Description</label>
                  <input
                    type="text"
                    className="bills-edit-input"
                    value={form.otherName}
                    onChange={(e) => setForm({ ...form, otherName: e.target.value })}
                  />
                </div>
              )}
              <div className="bills-edit-row">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="bills-edit-input"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div className="bills-edit-row">
                <label>Payment method</label>
                <select
                  className="bills-edit-select"
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.value} value={pm.value}>{pm.label}</option>
                  ))}
                </select>
              </div>
              <div className="bills-edit-row">
                <label>Expense date</label>
                <input
                  type="date"
                  className="bills-edit-input"
                  value={form.expenseDate}
                  onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                />
              </div>
              <div className="bills-detail-actions">
                <button type="button" className="back-button" onClick={closeModal}>Cancel</button>
                <button type="submit" className="nav-link-button" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensePage;
