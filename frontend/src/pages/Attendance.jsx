import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceService, employeeService } from '../services/api';
import { ArrowLeft, CheckCircle, Clock, XCircle, Calendar as CalendarIcon } from 'lucide-react';

const Attendance = () => {
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [empRes, attRes] = await Promise.all([
        employeeService.getAll(),
        attendanceService.getMonthly(new Date(selectedDate).getFullYear(), new Date(selectedDate).getMonth() + 1)
      ]);
      
      if (Array.isArray(empRes.data)) {
        setEmployees(empRes.data);
      }
      
      // Process attendance data for the selected date
      const todayAtt = {};
      if (Array.isArray(attRes.data)) {
        attRes.data.forEach(record => {
          if (record.date === selectedDate) {
            todayAtt[record.employeeId] = record.status;
          }
        });
      }
      setAttendanceData(todayAtt);
    } catch (err) {
      console.error('Failed to fetch attendance data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const markAttendance = async (employeeId, status) => {
    try {
      await attendanceService.mark({
        employeeId,
        date: selectedDate,
        status: status
      });
      setAttendanceData(prev => ({ ...prev, [employeeId]: status }));
    } catch (err) {
      alert('Failed to mark attendance');
    }
  };

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <div>
          <h1>📅 Attendance Management</h1>
          <p>Mark and view daily staff attendance</p>
        </div>
        <div className="header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className="date-selector">
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div className="attendance-content">
        <div className="attendance-table-container">
          <table className="attendance-calendar-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" className="loading">Loading staff...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan="3" className="no-data">No employees registered</td></tr>
              ) : employees.map(emp => (
                <tr key={emp.employeeId}>
                  <td>
                    <div className="employee-name-content">
                      <p className="employee-name">{emp.employeeName}</p>
                      <p className="employee-code">{emp.employeeCode}</p>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${attendanceData[emp.employeeId]?.toLowerCase() || 'pending'}`}>
                      {attendanceData[emp.employeeId] || 'NOT MARKED'}
                    </span>
                  </td>
                  <td className="action-buttons">
                    <button 
                      className="status-btn present" 
                      onClick={() => markAttendance(emp.employeeId, 'PRESENT')}
                      title="Present"
                    >
                      <CheckCircle size={18} color="green" />
                    </button>
                    <button 
                      className="status-btn half-day" 
                      onClick={() => markAttendance(emp.employeeId, 'HALF_DAY')}
                      title="Half Day"
                    >
                      <Clock size={18} color="orange" />
                    </button>
                    <button 
                      className="status-btn absent" 
                      onClick={() => markAttendance(emp.employeeId, 'ABSENT')}
                      title="Absent"
                    >
                      <XCircle size={18} color="red" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
