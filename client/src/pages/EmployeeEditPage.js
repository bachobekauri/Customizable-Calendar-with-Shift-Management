import React, { useState, useEffect, useCallback } from 'react';
import './mainPage.css';
import { useAuth } from '../contexts/AuthContext';
import { userService, shiftService} from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';

const EmployeeEditPage = () => {
  const { user, logout } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [employeeShifts, setEmployeeShifts] = useState([]);
  const [stats, setStats] = useState({
    totalShifts: 0,
    totalHours: 0,
    totalEarnings: 0
  });

  

  

  const fetchEmployeeData = useCallback(async () => {
    try {
      setLoading(true);
      
      
      const employeeResponse = await userService.getUser(id);
      const employeeData = employeeResponse.data.data;
      setEmployee(employeeData);
      setFormData({
        name: employeeData.name,
        email: employeeData.email,
        role: employeeData.role,
        department: employeeData.department,
        phone: employeeData.phone || '',
        avatarColor: employeeData.avatarcolor || '#164a52'
      });
      
      
      const shiftsResponse = await shiftService.getShifts({
        startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
        endDate: moment().format('YYYY-MM-DD')
      });
      
      const allShifts = shiftsResponse.data.data || [];

 
      const employeeShifts = allShifts.filter(shift => 
         shift.employees?.some(e => e._id === id)
      );

      
      setEmployeeShifts(employeeShifts);
      
      
      const totalShifts = employeeShifts.length;
      const totalHours = employeeShifts.reduce((sum, shift) => {
        const duration = moment(shift.endTime).diff(moment(shift.startTime), 'hours', true);
        return sum + duration;
      }, 0);
      const totalEarnings = employeeShifts.reduce((sum, shift) => {
        const duration = moment(shift.endTime).diff(moment(shift.startTime), 'hours', true);
        return sum + (duration * shift.hourlyRate);
      }, 0);
      
      setStats({
        totalShifts,
        totalHours: Math.round(totalHours * 10) / 10,
        totalEarnings: Math.round(totalEarnings * 100) / 100
      });
      
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  const handleSave = async () => {
    try {
      await userService.updateUser(id, formData);
      setEditing(false);
      fetchEmployeeData();
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Failed to update employee: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      try {
        await userService.deleteUser(id);
        navigate('/employees');
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Failed to delete employee: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const renderSidebar = () => (
    <aside className="sidebar">
      <div className="logo">Coral LAB</div>
      <nav>
        <button onClick={() => navigate('/main')}>Shifts</button>
        <button onClick={() => navigate('/employees')}>Employees</button>
        <button onClick={() => navigate('/reports')}>Reports</button>
        {user?.role === 'admin' && (
          <button onClick={() => navigate('/settings')}>Settings</button>
        )}
        <button onClick={logout} style={{ marginTop: 'auto' }}>Logout</button>
      </nav>
      <div className="profile">
        <div>{user?.name}</div>
        <div style={{ fontSize: '12px', opacity: 0.7 }}>{user?.role}</div>
      </div>
    </aside>
  );

  if (loading) {
    return (
      <div className="main-container">
        {renderSidebar()}
        <div className="content">
          <div className="loading-spinner">Loading employee data...</div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="main-container">
        {renderSidebar()}
        <div className="content">
          <h1>Employee not found</h1>
          <button onClick={() => navigate('/employees')}>Back to Employees</button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      {renderSidebar()}

      <div className="content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: 0 }}>Employee Details</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate('/employees')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f5f5f5',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Back
            </button>
            {user?.role === 'admin' && (
              <>
                <button
                  onClick={() => setEditing(!editing)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: editing ? '#6c757d' : '#40c3d8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {editing ? 'Cancel' : 'Edit'}
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#EA454C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Employee Information */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: formData.avatarColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '32px',
              fontWeight: 'bold',
              marginRight: '30px'
            }}>
              {formData.name?.charAt(0)}
            </div>
            
            <div style={{ flex: 1 }}>
              {editing ? (
                <input
                  type="color"
                  value={formData.avatarColor}
                  onChange={(e) => setFormData({...formData, avatarColor: e.target.value})}
                  style={{
                    marginBottom: '10px',
                    padding: '5px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    width: '60px',
                    height: '40px'
                  }}
                />
              ) : null}
              
              <div style={{ marginBottom: '15px' }}>
                {editing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    style={{
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      width: '300px'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{employee.name}</div>
                )}
                {editing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    style={{
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      marginTop: '5px',
                      width: '300px'
                    }}
                  />
                ) : (
                  <div style={{ color: '#666', marginTop: '5px' }}>{employee.email}</div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Role</div>
                  {editing ? (
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        backgroundColor: '#f8f9fa'
                      }}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <div style={{
                      padding: '4px 12px',
                      backgroundColor: employee.role === 'admin' ? '#ffebee' : 
                                     employee.role === 'manager' ? '#e3f2fd' : '#f3e5f5',
                      color: employee.role === 'admin' ? '#EA454C' : 
                            employee.role === 'manager' ? '#1976d2' : '#7b1fa2',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'inline-block'
                    }}>
                      {employee.role}
                    </div>
                  )}
                </div>
                
                <div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Department</div>
                  {editing ? (
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        backgroundColor: '#f8f9fa'
                      }}
                    >
                      <option value="General">General</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Development">Development</option>
                      <option value="Support">Support</option>
                      <option value="Management">Management</option>
                    </select>
                  ) : (
                    <div style={{ fontWeight: '500' }}>{employee.department}</div>
                  )}
                </div>
                
                <div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Phone</div>
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        backgroundColor: '#f8f9fa'
                      }}
                      placeholder="Phone number"
                    />
                  ) : (
                    <div style={{ fontWeight: '500' }}>{employee.phone || 'Not provided'}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {editing && (
            <div style={{ textAlign: 'right' }}>
              <button
                onClick={handleSave}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>
              {stats.totalShifts || 0}
            </div>
            <div style={{ color: '#666' }}>Total Shifts (30 days)</div>
          </div>
          
          <div style={{
            backgroundColor: '#e8f5e9',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#388e3c' }}>
              {stats.totalHours || 0}h
            </div>
            <div style={{ color: '#666' }}>Total Hours</div>
          </div>
          
          <div style={{
            backgroundColor: '#fff3e0',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f57c00' }}>
              ${stats.totalEarnings || 0}
            </div>
            <div style={{ color: '#666' }}>Total Earnings</div>
          </div>
          
          <div style={{
            backgroundColor: '#f3e5f5',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7b1fa2' }}>
              {employeeShifts.length > 0 
                ? Math.round((employeeShifts.filter(s => s.confirmed).length / employeeShifts.length) * 100) 
                : 0}%
            </div>
            <div style={{ color: '#666' }}>Attendance Rate</div>
          </div>
        </div>

        {/* Recent Shifts */}
        <div>
          <h2>Recent Shifts</h2>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            {employeeShifts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                No shifts assigned in the last 30 days
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                      <th style={{ textAlign: 'left', padding: '12px', color: '#666' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '12px', color: '#666' }}>Shift</th>
                      <th style={{ textAlign: 'left', padding: '12px', color: '#666' }}>Duration</th>
                      <th style={{ textAlign: 'left', padding: '12px', color: '#666' }}>Earnings</th>
                      <th style={{ textAlign: 'left', padding: '12px', color: '#666' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '12px', color: '#666' }}>Confirmed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeShifts.map(shift => (
                      <tr key={shift.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px' }}>
                          {moment(shift.startTime).format('MMM D, YYYY')}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '500' }}>{shift.title}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {formatDuration(shift.startTime, shift.endTime)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          ${(shift.hourlyRate * formatDurationNum(shift.startTime, shift.endTime)).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: shift.status === 'published' ? '#e3f2fd' : 
                                           shift.status === 'completed' ? '#e8f5e9' : '#f5f5f5',
                            color: shift.status === 'published' ? '#1976d2' : 
                                  shift.status === 'completed' ? '#388e3c' : '#666',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {shift.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            color: shift.confirmedEmployees?.includes(id) ? '#4CAF50' : '#ff9800',
                            fontWeight: '500'
                          }}>
                            
                            {shift.confirmedEmployees?.includes(id) ? '✓ Confirmed' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const formatTime = (date) => moment(date).format('HH:mm');
const formatDuration = (start, end) => {
  const hours = moment(end).diff(moment(start), 'hours', true);
  return `${Math.round(hours * 10) / 10}h`;
};
const formatDurationNum = (start, end) => moment(end).diff(moment(start), 'hours', true);

export default EmployeeEditPage;