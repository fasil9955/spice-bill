import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  invoiceService,
  accountingService,
  expenseService,
  employeeService,
} from '../services/api';
import { ArrowLeft, Printer, Plus, Trash2 } from 'lucide-react';
import './DailyAccountingPage.css';

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const formatDisplayDate = (isoDate) => {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
};

const parseDisplayDate = (ddmmyyyy) => {
  const parts = String(ddmmyyyy).split('-');
  if (parts.length !== 3) return getTodayDateString();
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
];

const formatPaymentMethod = (pm) => {
  if (!pm) return 'Cash';
  const found = PAYMENT_METHODS.find((p) => p.value === pm);
  return found ? found.label : String(pm);
};

const formatTime = (createdAt) => {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const DailyAccountingPage = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [displayDate, setDisplayDate] = useState(formatDisplayDate(getTodayDateString()));
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [invoices, setInvoices] = useState([]);
  const [billingBookSales, setBillingBookSales] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [openingCash, setOpeningCash] = useState('');
  const [openingUpi, setOpeningUpi] = useState('');

  const [cardEntries, setCardEntries] = useState([]);
  const [gpayEntries, setGpayEntries] = useState([]);
  const [cashBalance, setCashBalance] = useState('');

  const [addExpenseAccountType, setAddExpenseAccountType] = useState('EMPLOYEE');
  const [addExpenseEmployeeId, setAddExpenseEmployeeId] = useState('');
  const [addExpenseName, setAddExpenseName] = useState('');
  const [addExpenseAmount, setAddExpenseAmount] = useState('0.00');
  const [addExpensePayment, setAddExpensePayment] = useState('CASH');
  const [addExpenseSaving, setAddExpenseSaving] = useState(false);

  const [cardName, setCardName] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [gpayName, setGpayName] = useState('');
  const [gpayAmount, setGpayAmount] = useState('');

  const navigate = useNavigate();

  const isoDate = parseDisplayDate(displayDate);

  const loadData = async () => {
    setLoading(true);
    setDataLoaded(false);
    try {
      const [invRes, sumRes, expRes, empRes] = await Promise.all([
        invoiceService.getByDate(isoDate),
        accountingService.getDaySummary(isoDate).catch(() => ({ data: {} })),
        expenseService.getByDate(isoDate),
        employeeService.getAll().catch(() => ({ data: [] })),
      ]);

      const invList = Array.isArray(invRes?.data) ? invRes.data : [];
      const retailInvoices = invList.filter((i) => (i.invoiceType || 'RETAIL') === 'RETAIL');
      setInvoices(retailInvoices);

      const sumData = sumRes?.data;
      setBillingBookSales(sumData?.billingBookSales != null ? String(sumData.billingBookSales) : '');
      setOpeningCash(sumData?.openingCash != null ? String(sumData.openingCash) : '');
      setOpeningUpi(sumData?.openingUpi != null ? String(sumData.openingUpi) : '');
      setCashBalance(sumData?.closingCash != null ? String(sumData.closingCash) : '');

      setExpenses(Array.isArray(expRes?.data) ? expRes.data : []);
      setEmployees(Array.isArray(empRes?.data) ? empRes.data : []);
    } catch (err) {
      console.error('Load data failed', err);
    } finally {
      setLoading(false);
      setDataLoaded(true);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLoadData = () => {
    setSelectedDate(isoDate);
    loadData();
  };

  const systemSales = invoices.reduce((s, i) => s + (parseFloat(i.totalAmount) || 0), 0);
  const billingBookNum = parseFloat(billingBookSales) || 0;
  const totalSales = systemSales + billingBookNum;

  const paymentBreakdown = invoices.reduce(
    (acc, i) => ({
      CARD: acc.CARD + (parseFloat(i.cardAmount) || 0),
      UPI: acc.UPI + (parseFloat(i.upiAmount) || 0),
      CASH: acc.CASH + (parseFloat(i.cashAmount) || 0),
    }),
    { CARD: 0, UPI: 0, CASH: 0 }
  );

  const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const totalCardManual = cardEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalGpayManual = gpayEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const cashBalanceNum = parseFloat(cashBalance) || 0;
  const totalPayments = totalCardManual + totalGpayManual + cashBalanceNum;

  const openingCashNum = parseFloat(openingCash) || 0;
  const openingUpiNum = parseFloat(openingUpi) || 0;
  const balanceResult = totalSales + openingCashNum + openingUpiNum - totalExpenses - totalPayments;

  const preventNumberScroll = (e) => {
    e.target.blur();
  };

  const employeeMap = employees.reduce((acc, e) => {
    const id = e.employeeId ?? e.id;
    acc[id] = e.employeeName || e.name || `Employee #${id}`;
    return acc;
  }, {});

  const saveClosing = async (closingCashOverride, closingGpayOverride) => {
    const billing = parseFloat(billingBookSales);
    const billingVal = Number.isFinite(billing) && billing >= 0 ? billing : 0;
    const closingCashVal = closingCashOverride !== undefined ? closingCashOverride : (parseFloat(cashBalance) || 0);
    const closingGpayVal = closingGpayOverride !== undefined ? closingGpayOverride : gpayEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    try {
      await accountingService.updateDaySummary(isoDate, {
        billingBookSales: billingVal,
        closingCash: closingCashVal,
        closingGpayTotal: closingGpayVal,
      });
    } catch (err) {
      console.error('Save closing failed', err);
    }
  };

  const handleSaveBillingBook = async () => {
    const val = parseFloat(billingBookSales);
    if (!Number.isFinite(val) || val < 0) return;
    try {
      await accountingService.updateDaySummary(isoDate, {
        billingBookSales: val,
        closingCash: parseFloat(cashBalance) || 0,
        closingGpayTotal: gpayEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
      });
    } catch (err) {
      console.error('Save billing book failed', err);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amount = parseFloat(addExpenseAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const isEmployee = addExpenseAccountType === 'EMPLOYEE';
    if (isEmployee) {
      const empId = addExpenseEmployeeId ? parseInt(addExpenseEmployeeId, 10) : null;
      if (!empId) return;
      setAddExpenseSaving(true);
      try {
        await expenseService.create({
          accountType: 'EMPLOYEE',
          employeeId: empId,
          amount,
          paymentMethod: addExpensePayment || 'CASH',
          expenseDate: isoDate,
        });
        setAddExpenseEmployeeId('');
        setAddExpenseAmount('0.00');
        await loadData();
      } catch (err) {
        console.error('Add expense failed', err);
      } finally {
        setAddExpenseSaving(false);
      }
    } else {
      const name = (addExpenseName || '').trim();
      if (!name) return;
      setAddExpenseSaving(true);
      try {
        await expenseService.create({
          accountType: 'OTHER',
          otherName: name,
          amount,
          paymentMethod: addExpensePayment || 'CASH',
          expenseDate: isoDate,
        });
        setAddExpenseName('');
        setAddExpenseAmount('0.00');
        await loadData();
      } catch (err) {
        console.error('Add expense failed', err);
      } finally {
        setAddExpenseSaving(false);
      }
    }
  };

  const handleRemoveExpense = async (record) => {
    if (!window.confirm('Remove this expense?')) return;
    try {
      await expenseService.delete(record.expenseId);
      await loadData();
    } catch (err) {
      console.error('Delete expense failed', err);
    }
  };

  const addCardEntry = () => {
    const amt = parseFloat(cardAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setCardEntries((prev) => [...prev, { id: Date.now(), name: (cardName || '').trim() || 'Card', amount: cardAmount }]);
    setCardName('');
    setCardAmount('');
  };

  const addGpayEntry = () => {
    const amt = parseFloat(gpayAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    const newTotal = totalGpayManual + amt;
    setGpayEntries((prev) => [...prev, { id: Date.now(), name: (gpayName || '').trim() || 'GPay/UPI', amount: gpayAmount }]);
    setGpayName('');
    setGpayAmount('');
    saveClosing(undefined, newTotal);
  };

  const removeCardEntry = (id) => setCardEntries((prev) => prev.filter((e) => e.id !== id));
  const removeGpayEntry = (id) => {
    const entry = gpayEntries.find((e) => e.id === id);
    const entryAmount = entry ? parseFloat(entry.amount) || 0 : 0;
    const newTotal = Math.max(0, totalGpayManual - entryAmount);
    setGpayEntries((prev) => prev.filter((e) => e.id !== id));
    saveClosing(undefined, newTotal);
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) return;
    const resultLabel = balanceResult < 0 ? 'more' : balanceResult > 0 ? 'shortage' : 'tally';
    const moreOrShortage = `${resultLabel}${balanceResult !== 0 ? `: ₹${Math.abs(balanceResult).toFixed(2)}` : ''}`;
    const escapeHtml = (s) => {
      if (typeof s !== 'string') return '';
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };
    const expensesListHtml =
      expenses.length === 0
        ? '<p class="print-expense-item">No expenses.</p>'
        : expenses
            .map((exp) => {
              const name =
                exp.accountType === 'EMPLOYEE'
                  ? (employeeMap[exp.employeeId] || exp.otherName || '—')
                  : (exp.otherName || '—');
              const amt = (parseFloat(exp.amount) || 0).toFixed(2);
              return `<p class="print-expense-item"><span>${escapeHtml(String(name))}</span><span class="print-amount">₹${amt}</span></p>`;
            })
            .join('');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Day Close - ${formatDisplayDate(isoDate)}</title>
      <style>
        @media print { body { width: 80mm; max-width: 80mm; margin: 0; padding: 4mm; } }
        body { font-family: Arial, sans-serif; font-size: 10px; padding: 4mm; width: 80mm; max-width: 80mm; margin: 0; box-sizing: border-box; color: #000; }
        * { box-sizing: border-box; }
        h1 { font-size: 12px; margin: 0 0 6px; font-weight: 700; text-align: center; }
        h2 { font-size: 10px; margin: 8px 0 4px; font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 2px; }
        p { margin: 2px 0; line-height: 1.3; }
        .print-row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; line-height: 1.3; }
        .print-row .print-amount { text-align: right; flex-shrink: 0; }
        .print-expense-item { display: flex; justify-content: space-between; gap: 8px; margin: 1px 0; line-height: 1.3; }
        .print-expense-item .print-amount { text-align: right; flex-shrink: 0; }
        .last-row { margin-top: 10px; padding-top: 8px; border-top: 2px solid #000; font-weight: 700; font-size: 11px; text-align: center; }
      </style></head><body>
      <h1>Accounting &amp; Day Close</h1>
      <p><strong>Date:</strong> ${formatDisplayDate(isoDate)}</p>
      <h2>Sales</h2>
      <p class="print-row">System Sales:<span class="print-amount">₹${systemSales.toFixed(2)}</span></p>
      <p class="print-row">Billing Book:<span class="print-amount">₹${billingBookNum.toFixed(2)}</span></p>
      <p class="print-row"><strong>Total Sales:</strong><span class="print-amount">₹${totalSales.toFixed(2)}</span></p>
      <h2>Opening Balance</h2>
      <p class="print-row">Cash:<span class="print-amount">₹${openingCashNum.toFixed(2)}</span></p>
      <p class="print-row">UPI:<span class="print-amount">₹${openingUpiNum.toFixed(2)}</span></p>
      <h2>Expenses</h2>
      ${expensesListHtml}
      <p class="print-row"><strong>Total Expenses:</strong><span class="print-amount">₹${totalExpenses.toFixed(2)}</span></p>
      <h2>Payments (Card+GPay+Cash)</h2>
      <p class="print-row">Total:<span class="print-amount">₹${totalPayments.toFixed(2)}</span></p>
      <p class="last-row">${moreOrShortage}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="daily-accounting-page">
      <div className="daily-accounting-header">
        <div>
          <h1>Accounting &amp; Day Close</h1>
          <p>Manage daily accounting and payment splits.</p>
        </div>
        <div className="daily-accounting-header-actions">
          <button type="button" className="daily-accounting-print-btn" onClick={handlePrintReport}>
            <Printer size={18} /> Print Report
          </button>
          <button type="button" className="daily-accounting-back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Dashboard
          </button>
        </div>
      </div>

      <div id="daily-accounting-print-area" className="daily-accounting-print-area" aria-hidden="true" />

      <div className="daily-accounting-card daily-accounting-date-card">
        <label className="daily-accounting-label">Select Date:</label>
        <input
          type="text"
          placeholder="DD-MM-YYYY"
          value={displayDate}
          onChange={(e) => setDisplayDate(e.target.value)}
          className="daily-accounting-date-input"
        />
        <button type="button" className="daily-accounting-load-btn" onClick={handleLoadData} disabled={loading}>
          {loading ? 'Loading…' : 'Load Data'}
        </button>
      </div>

      {!dataLoaded && !loading && (
        <p className="daily-accounting-hint">Select a date and click Load Data to view accounting for that day.</p>
      )}

      {dataLoaded && (
        <>
          <div className="daily-accounting-grid-top">
            <div className="daily-accounting-sales-section">
              <h3 className="daily-accounting-section-title">Sales Summary</h3>
              <div className="daily-accounting-sales-row">
                <label>System Sales:</label>
                <input type="text" readOnly value={systemSales.toFixed(2)} className="daily-accounting-input-readonly" />
              </div>
              <div className="daily-accounting-sales-row">
                <label>Sales on Billing Book:</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={billingBookSales}
                  onChange={(e) => setBillingBookSales(e.target.value)}
                  onBlur={handleSaveBillingBook}
                  onWheel={preventNumberScroll}
                  className="daily-accounting-input"
                />
              </div>
              <div className="daily-accounting-total-sales-card">
                <span>TOTAL SALES</span>
                <span className="daily-accounting-total-sales-amount">₹{totalSales.toFixed(2)}</span>
              </div>
            </div>

            <div className="daily-accounting-opening-card">
              <h3 className="daily-accounting-section-title">Opening Balance</h3>
              <div className="daily-accounting-opening-row">
                <label>CASH</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0.00"
                  onWheel={preventNumberScroll}
                  className="daily-accounting-input"
                />
              </div>
              <div className="daily-accounting-opening-row">
                <label>UPI</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingUpi}
                  onChange={(e) => setOpeningUpi(e.target.value)}
                  placeholder="0.00"
                  onWheel={preventNumberScroll}
                  className="daily-accounting-input"
                />
              </div>
            </div>
          </div>

          <div className="daily-accounting-card daily-accounting-breakdown-card">
            <h3 className="daily-accounting-section-title">System Bills Payment Breakdown</h3>
            <div className="daily-accounting-breakdown-panels">
              <div className="daily-accounting-breakdown-panel">
                <span>CARD</span>
                <span>₹{paymentBreakdown.CARD.toFixed(2)}</span>
              </div>
              <div className="daily-accounting-breakdown-panel">
                <span>UPI</span>
                <span>₹{paymentBreakdown.UPI.toFixed(2)}</span>
              </div>
              <div className="daily-accounting-breakdown-panel">
                <span>CASH</span>
                <span>₹{paymentBreakdown.CASH.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="daily-accounting-two-col">
            <div className="daily-accounting-card daily-accounting-expenses-card">
              <div className="daily-accounting-expenses-header">
                <h3 className="daily-accounting-section-title">Expenses</h3>
                <form onSubmit={handleAddExpense} className="daily-accounting-add-expense-form daily-accounting-add-expense-form-stacked">
                  <div className="daily-accounting-add-expense-row">
                    <label className="daily-accounting-add-expense-label">Account Type:</label>
                    <select
                      value={addExpenseAccountType}
                      onChange={(e) => {
                        setAddExpenseAccountType(e.target.value);
                        if (e.target.value === 'OTHER') setAddExpenseEmployeeId('');
                        else setAddExpenseName('');
                      }}
                      className="daily-accounting-add-expense-select"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="daily-accounting-add-expense-row">
                    <label className="daily-accounting-add-expense-label">Name:</label>
                    {addExpenseAccountType === 'EMPLOYEE' ? (
                      <select
                        value={addExpenseEmployeeId}
                        onChange={(e) => setAddExpenseEmployeeId(e.target.value)}
                        className="daily-accounting-add-expense-select"
                      >
                        <option value="">Select Employee</option>
                        {employees.map((emp) => (
                          <option key={emp.employeeId} value={emp.employeeId}>{emp.employeeName || emp.employeeCode || `Employee ${emp.employeeId}`}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Name"
                        value={addExpenseName}
                        onChange={(e) => setAddExpenseName(e.target.value)}
                        className="daily-accounting-add-expense-input"
                      />
                    )}
                  </div>
                  <div className="daily-accounting-add-expense-row">
                    <label className="daily-accounting-add-expense-label">Amount:</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addExpenseAmount}
                      onChange={(e) => setAddExpenseAmount(e.target.value)}
                  onWheel={preventNumberScroll}
                      className="daily-accounting-add-expense-input daily-accounting-add-expense-amount"
                    />
                  </div>
                  <div className="daily-accounting-add-expense-row">
                    <label className="daily-accounting-add-expense-label">Payment Method:</label>
                    <select
                      value={addExpensePayment}
                      onChange={(e) => setAddExpensePayment(e.target.value)}
                      className="daily-accounting-add-expense-select"
                    >
                      {PAYMENT_METHODS.map((pm) => (
                        <option key={pm.value} value={pm.value}>{pm.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="daily-accounting-add-expense-row daily-accounting-add-expense-actions">
                    <button type="submit" className="daily-accounting-add-expense-btn" disabled={addExpenseSaving}>
                      <Plus size={16} /> Add Expense
                    </button>
                  </div>
                </form>
              </div>
              <div className="daily-accounting-table-wrap">
                <table className="daily-accounting-table">
                  <thead>
                    <tr>
                      <th>TIME</th>
                      <th>NAME</th>
                      <th>AMOUNT</th>
                      <th>PAYMENT METHOD</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="daily-accounting-empty">No expenses for this date.</td>
                      </tr>
                    ) : (
                      expenses.map((exp) => (
                        <tr key={exp.expenseId}>
                          <td>{formatTime(exp.createdAt)}</td>
                          <td>
                            {exp.accountType === 'EMPLOYEE'
                              ? (employeeMap[exp.employeeId] || exp.otherName || '—')
                              : (exp.otherName || '—')}
                          </td>
                          <td>₹{(parseFloat(exp.amount) || 0).toFixed(2)}</td>
                          <td>{formatPaymentMethod(exp.paymentMethod)}</td>
                          <td>
                            <button
                              type="button"
                              className="daily-accounting-remove-btn"
                              onClick={() => handleRemoveExpense(exp)}
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {expenses.length > 0 && (
                  <p className="daily-accounting-total-row">Total: ₹{totalExpenses.toFixed(2)}</p>
                )}
              </div>
            </div>

            <div className="daily-accounting-card daily-accounting-payment-totals-card">
              <h3 className="daily-accounting-section-title">Payment Totals</h3>

              <div className="daily-accounting-payment-blocks">
                <div className="daily-accounting-payment-block">
                  <div className="daily-accounting-payment-block-header">
                    <span className="daily-accounting-payment-block-title">Card</span>
                    <span className="daily-accounting-payment-total">Total: ₹{totalCardManual.toFixed(2)}</span>
                  </div>
                  <div className="daily-accounting-payment-row">
                    <label className="daily-accounting-payment-label">Card name</label>
                    <input
                      type="text"
                      placeholder="Card name"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="daily-accounting-payment-input"
                    />
                  </div>
                  <div className="daily-accounting-payment-row">
                    <label className="daily-accounting-payment-label">Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={cardAmount}
                      onChange={(e) => setCardAmount(e.target.value)}
                      onWheel={preventNumberScroll}
                      className="daily-accounting-payment-input daily-accounting-payment-amount"
                    />
                    <button type="button" className="daily-accounting-add-card-btn" onClick={addCardEntry}>
                      + Add Card
                    </button>
                  </div>
                  {cardEntries.length > 0 && (
                    <ul className="daily-accounting-entry-list">
                      {cardEntries.map((e) => (
                        <li key={e.id}>
                          <span>{e.name} ₹{(parseFloat(e.amount) || 0).toFixed(2)}</span>
                          <button type="button" className="daily-accounting-entry-remove" onClick={() => removeCardEntry(e.id)} aria-label="Remove">×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="daily-accounting-payment-block">
                  <div className="daily-accounting-payment-block-header">
                    <span className="daily-accounting-payment-block-title">GPay / UPI</span>
                    <span className="daily-accounting-payment-total">Total: ₹{totalGpayManual.toFixed(2)}</span>
                  </div>
                  <div className="daily-accounting-payment-row">
                    <label className="daily-accounting-payment-label">GPay name</label>
                    <input
                      type="text"
                      placeholder="GPay name"
                      value={gpayName}
                      onChange={(e) => setGpayName(e.target.value)}
                      className="daily-accounting-payment-input"
                    />
                  </div>
                  <div className="daily-accounting-payment-row">
                    <label className="daily-accounting-payment-label">Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={gpayAmount}
                      onChange={(e) => setGpayAmount(e.target.value)}
                      onWheel={preventNumberScroll}
                      className="daily-accounting-payment-input daily-accounting-payment-amount"
                    />
                    <button type="button" className="daily-accounting-add-gpay-btn" onClick={addGpayEntry}>
                      + Add GPay
                    </button>
                  </div>
                  {gpayEntries.length > 0 && (
                    <ul className="daily-accounting-entry-list">
                      {gpayEntries.map((e) => (
                        <li key={e.id}>
                          <span>{e.name} ₹{(parseFloat(e.amount) || 0).toFixed(2)}</span>
                          <button type="button" className="daily-accounting-entry-remove" onClick={() => removeGpayEntry(e.id)} aria-label="Remove">×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="daily-accounting-payment-block daily-accounting-payment-block-cash">
                  <div className="daily-accounting-payment-row">
                    <label className="daily-accounting-payment-label">Cash Balance</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={cashBalance}
                      onChange={(e) => setCashBalance(e.target.value)}
                      onBlur={() => saveClosing()}
                      onWheel={preventNumberScroll}
                      className="daily-accounting-payment-input daily-accounting-payment-amount"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="daily-accounting-card daily-accounting-balance-card">
            <h3 className="daily-accounting-section-title">Balance Check</h3>
            <div className="daily-accounting-balance-rows">
              <div className="daily-accounting-balance-row">
                <span>Total Sales:</span>
                <span>₹{totalSales.toFixed(2)}</span>
              </div>
              <div className="daily-accounting-balance-row">
                <span>+ Opening Balance:</span>
                <span>₹{(openingCashNum + openingUpiNum).toFixed(2)}</span>
              </div>
              <div className="daily-accounting-balance-row">
                <span>− Total Expenses:</span>
                <span>₹{totalExpenses.toFixed(2)}</span>
              </div>
              <div className="daily-accounting-balance-row">
                <span>− Total Payments (Card + UPI + Cash):</span>
                <span>₹{totalPayments.toFixed(2)}</span>
              </div>
              <div className="daily-accounting-balance-row daily-accounting-balance-result">
                <span>Result:</span>
                <span>₹{balanceResult.toFixed(2)}</span>
              </div>
              <div className="daily-accounting-balance-row daily-accounting-result-label">
                <span>{balanceResult < 0 ? 'more' : balanceResult > 0 ? 'shortage' : 'tally'}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DailyAccountingPage;
