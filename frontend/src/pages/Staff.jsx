import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeService } from '../services/api';
import { Plus, Search, Edit, Trash2, ArrowLeft, UserCircle } from 'lucide-react';

const Staff = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState({
    employeeName: '',
    employeeCode: '',
    role: 'CASHIER',
    phone: '',
    email: '',
    baseSalary: 0,
    joiningDate: new Date().toISOString().split('T')[0]
  });
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
    try {
      if (currentEmployee.employeeId) {
        await employeeService.update(currentEmployee.employeeId, currentEmployee);
      } else {
        await employeeService.create(currentEmployee);
      }
      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      alert('Failed to save employee');
    }
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
          <button className="add-button" onClick={() => {
            setCurrentEmployee({
              employeeName: '',
              employeeCode: '',
              role: 'CASHIER',
              phone: '',
              email: '',
              baseSalary: 0,
              joiningDate: new Date().toISOString().split('T')[0]
            });
            setShowModal(true);
          }}>
            <Plus size={18} /> Add Staff
          </button>
        </div>
      </div>

      <div className="employees-table-container">
        <table className="employees-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Base Salary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="loading">Loading staff...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan="6" className="no-data">No employees found</td></tr>
            ) : employees.map(emp => (
              <tr key={emp.employeeId}>
                <td>{emp.employeeCode}</td>
                <td>
                  <div className="employee-name-cell">
                    <UserCircle size={20} className="feature-icon" style={{fontSize: '20px', margin: 0}} />
                    <span>{emp.employeeName}</span>
                  </div>
                </td>
                <td><span className={`type-badge`}>{emp.role}</span></td>
                <td>{emp.phone}</td>
                <td>₹{emp.baseSalary}</td>
                <td className="action-buttons">
                  <button className="edit-btn" onClick={() => {
                    setCurrentEmployee(emp);
                    setShowModal(true);
                  }}>
                    <Edit size={16} />
                  </button>
                  <button className="remove-btn">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{currentEmployee.employeeId ? 'Edit Staff' : 'Add New Staff'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave} className="employee-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={currentEmployee.employeeName} 
                    onChange={e => setCurrentEmployee({...currentEmployee, employeeName: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Staff Code</label>
                  <input 
                    type="text" 
                    value={currentEmployee.employeeCode} 
                    onChange={e => setCurrentEmployee({...currentEmployee, employeeCode: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <select 
                    value={currentEmployee.role} 
                    onChange={e => setCurrentEmployee({...currentEmployee, role: e.target.value})}
                  >
                    <option value="CASHIER">Cashier</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Base Salary (₹)</label>
                  <input 
                    type="number" 
                    value={currentEmployee.baseSalary} 
                    onChange={e => setCurrentEmployee({...currentEmployee, baseSalary: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input 
                    type="text" 
                    value={currentEmployee.phone} 
                    onChange={e => setCurrentEmployee({...currentEmployee, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    value={currentEmployee.email} 
                    onChange={e => setCurrentEmployee({...currentEmployee, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Save Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
