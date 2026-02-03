import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceService, employeeService } from '../services/api';
import { ArrowLeft, Calendar as CalendarIcon, LogOut, Check, X, Minus } from 'lucide-react';
import './Attendance.css';

const STATUS_ORDER = ['PRESENT', 'ABSENT', 'HALF_DAY', null]; // null = not marked

const getMonthStartEnd = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  return { startStr, endStr, daysInMonth: end.getDate() };
};

const formatDateLong = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const formatMonthYear = (year, month) => {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const Attendance = () => {
  const now = new Date();
  const [user, setUser] = useState(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // key: `${empId}-${dateStr}` -> { status, attendanceId }
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // `${empId}-${dateStr}` while saving
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (_) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  const { startStr, endStr, daysInMonth } = useMemo(
    () => getMonthStartEnd(year, month),
    [year, month]
  );

  const todayStr = useMemo(() => now.toISOString().slice(0, 10), []);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const todayDay = now.getDate();
  // Column order: for current month put today last so it can be pinned right; else natural 1..daysInMonth
  const dayOrder = useMemo(() => {
    const all = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    if (!isCurrentMonth || todayDay < 1 || todayDay > daysInMonth) return all;
    const rest = all.filter((d) => d !== todayDay);
    return [...rest, todayDay];
  }, [daysInMonth, isCurrentMonth, todayDay]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empRes = await employeeService.getAll();
      const list = empRes?.data;
      setEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch employees', err);
      setEmployees([]);
    }

    try {
      const attRes = await attendanceService.getByDateRange(startStr, endStr);
      const records = attRes?.data || [];
      const map = {};
      records.forEach((rec) => {
        const empId = rec.employee?.employeeId ?? rec.employeeId;
        const dateStr = rec.attendanceDate ? rec.attendanceDate.slice(0, 10) : null;
        if (empId != null && dateStr) {
          map[`${empId}-${dateStr}`] = { status: rec.status, attendanceId: rec.attendanceId };
        }
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error('Failed to fetch attendance', err);
      setAttendanceMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startStr, endStr]);

  const getStatusFor = (empId, day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${empId}-${dateStr}`;
    const entry = attendanceMap[key];
    return entry ? entry.status : null;
  };

  const getAttendanceIdFor = (empId, day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${empId}-${dateStr}`;
    const entry = attendanceMap[key];
    return entry?.attendanceId ?? null;
  };

  const cycleStatus = (currentStatus) => {
    const idx = STATUS_ORDER.indexOf(currentStatus);
    const nextIdx = (idx + 1) % STATUS_ORDER.length;
    return STATUS_ORDER[nextIdx];
  };

  const markCell = async (empId, day, currentStatus) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${empId}-${dateStr}`;
    const nextStatus = cycleStatus(currentStatus);
    setUpdating(key);

    try {
      if (nextStatus === null) {
        const attId = getAttendanceIdFor(empId, day);
        if (attId) {
          await attendanceService.delete(attId);
        }
        setAttendanceMap((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else if (currentStatus === null) {
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const res = await attendanceService.mark({
          employee: { employeeId: empId },
          attendanceDate: dateStr,
          attendanceTime: time,
          status: nextStatus,
        });
        const created = res?.data;
        setAttendanceMap((prev) => ({
          ...prev,
          [key]: { status: nextStatus, attendanceId: created?.attendanceId },
        }));
      } else {
        const attId = getAttendanceIdFor(empId, day);
        if (attId) {
          await attendanceService.update(attId, { status: nextStatus });
          setAttendanceMap((prev) => ({
            ...prev,
            [key]: { ...prev[key], status: nextStatus },
          }));
        }
      }
    } catch (err) {
      console.error('Failed to update attendance', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="attendance-page">
      <div className="attendance-header">
        <div className="attendance-header-left">
          <div className="attendance-header-icon">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1>Daily Attendance Entry</h1>
            <p className="attendance-header-subtitle">
              {isAdmin ? 'View and edit attendance for any day.' : "View current month attendance — you can only change today's date."}
            </p>
          </div>
        </div>
        <div className="attendance-header-actions">
          <button type="button" className="attendance-dashboard-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Dashboard
          </button>
          <button type="button" className="attendance-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="attendance-month-selector">
          <label>Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      <div className="attendance-date-panel">
        <p className="attendance-date-display">{formatDateLong(todayStr)}</p>
        <p className="attendance-date-context">Today&apos;s Attendance - {formatMonthYear(year, month)}</p>
      </div>

      <div className="attendance-legend">
        <span className="attendance-legend-item">
          <span className="legend-present">✓</span> Present
        </span>
        <span className="attendance-legend-item">
          <span className="legend-absent">✕</span> Absent
        </span>
        <span className="attendance-legend-item">
          <span className="legend-half">—</span> Half Day
        </span>
        <span className="attendance-legend-item">
          <span className="legend-dot">.</span> Not Marked
        </span>
      </div>

      <div className="attendance-grid-card">
        <div className="attendance-grid-wrap">
          <table className="attendance-grid-table">
            <thead>
              <tr>
                <th className="attendance-col-name">EMPLOYEE NAME</th>
                {dayOrder.map((day) => {
                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = isCurrentMonth && dateStr === todayStr;
                  return (
                    <th key={day} className={`attendance-col-day ${isToday ? 'attendance-today-col attendance-today-pinned' : ''}`}>
                      {day}
                      {isToday && <span className="day-today-label">TODAY</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={daysInMonth + 1} className="attendance-loading">
                    Loading attendance...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 1} className="attendance-no-data">
                    No employees registered.
                  </td>
                </tr>
              ) : (
                employees.map((emp, index) => {
                  const empId = emp.employeeId ?? emp.id;
                  const name = emp.employeeName ?? emp.name ?? '—';
                  return (
                    <tr key={empId}>
                      <td className="attendance-cell-name">
                        <span className="employee-name-text">{name}</span>
                        <span className="employee-serial">{index + 1}</span>
                      </td>
                      {dayOrder.map((day) => {
                        const status = getStatusFor(empId, day);
                        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const cellKey = `${empId}-${dateStr}`;
                        const isTodayCell = isCurrentMonth && dateStr === todayStr;
                        const isEditable = isAdmin || isTodayCell;
                        const isUpdating = updating === cellKey;
                        let cellClass = 'attendance-day-cell cell-not-marked';
                        let symbol = '.';
                        if (status === 'PRESENT') {
                          cellClass = 'attendance-day-cell cell-present';
                          symbol = '✓';
                        } else if (status === 'ABSENT') {
                          cellClass = 'attendance-day-cell cell-absent';
                          symbol = '✕';
                        } else if (status === 'HALF_DAY') {
                          cellClass = 'attendance-day-cell cell-half-day';
                          symbol = '—';
                        }
                        if (isUpdating || !isEditable) cellClass += ' cell-disabled';
                        return (
                          <td key={day} className={isTodayCell ? 'attendance-today-pinned' : ''}>
                            {isEditable ? (
                              <button
                                type="button"
                                className={cellClass}
                                onClick={() => !isUpdating && markCell(empId, day, status)}
                                disabled={isUpdating}
                                title={isAdmin ? `${day}/${month}/${year} – click to change` : 'Today - click to change'}
                              >
                                {symbol}
                              </button>
                            ) : (
                              <span className={`${cellClass} cell-read-only`} title={`${day}/${month}/${year} (view only)`}>
                                {symbol}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
