import React, { useState, useEffect } from 'react';
import './mainPage.css';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const EmployeesPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getUsers();
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to load employees. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmployee = (employeeId) => {
    navigate(`/employees/${employeeId}/edit`);
  };

  const handleViewSchedule = (employeeId) => {
    navigate(`/employee-schedule/${employeeId}`);
  };

  const handleAddEmployee = () => {
    navigate('/signup');
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || 
                             employee.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  if (loading) {
    return (
      <div className="main-container">
        <aside className="sidebar">
          <div className="logo">Coral LAB</div>
          <nav>
            <button onClick={() => navigate('/main')}>📅 Shifts</button>

            {user?.role === 'employee' ? (
              <>
                <button className="active">👥 Team</button>
                <button onClick={() => navigate('/request-schedule')}>📋 Requests</button>
                <button onClick={() => navigate('/settings')}>⚙️ Settings</button>
              </>
            ) : (
              <>
                {(user?.role === 'manager' || user?.role === 'admin') && (
                  <button className="active">👥 Employees</button>
                )}

                {(user?.role === 'manager' || user?.role === 'admin') && (
                  <button onClick={() => navigate("/requests")}>📨 Requests</button>
                )}

                {(user?.role === 'manager' || user?.role === 'admin') && (
                  <button onClick={() => navigate("/reports")}>📊 Reports</button>
                )}

                {user?.role === 'admin' && (
                  <button onClick={() => navigate("/settings")}>⚙️ Settings</button>
                )}
              </>
            )}

            <button onClick={logout} style={{ marginTop: "auto" }}>
              🚪 Logout
            </button>
          </nav>
          <div className="profile">
            <div>{user?.name}</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>{user?.role}</div>
          </div>
        </aside>

        <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>Loading employees...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      {/* LEFT SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">Coral LAB</div>
        <nav>
          <button onClick={() => navigate('/main')}>📅 Shifts</button>

          {user?.role === 'employee' ? (
            <>
              <button className="active">👥 Team</button>
              <button onClick={() => navigate('/request-schedule')}>📋 Requests</button>
              <button onClick={() => navigate('/settings')}>⚙️ Settings</button>
            </>
          ) : (
            <>
              {(user?.role === 'manager' || user?.role === 'admin') && (
                <button className="active">👥 Employees</button>
              )}

              {(user?.role === 'manager' || user?.role === 'admin') && (
                <button onClick={() => navigate("/requests")}>📨 Requests</button>
              )}

              {(user?.role === 'manager' || user?.role === 'admin') && (
                <button onClick={() => navigate("/reports")}>📊 Reports</button>
              )}

              {user?.role === 'admin' && (
                <button onClick={() => navigate("/settings")}>⚙️ Settings</button>
              )}
            </>
          )}

          <button onClick={logout} style={{ marginTop: "auto" }}>
            🚪 Logout
          </button>
        </nav>
        <div className="profile">
          <div>{user?.name}</div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>{user?.role}</div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="content" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* HEADER SECTION - FIXED */}
        <div style={{ 
          paddingBottom: '30px',
          borderBottom: '1px solid #eee',
          flexShrink: 0
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <h1 style={{ margin: 0 }}>👥 {user?.role === 'employee' ? 'Team Members' : 'Employees'} ({filteredEmployees.length})</h1>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  width: '200px'
                }}
              />
              
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Departments</option>
                <option value="General">General</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Development">Development</option>
                <option value="Support">Support</option>
                <option value="Management">Management</option>
              </select>
              
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <button 
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#40c3d8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={handleAddEmployee}
                >
                  + Add Employee
                </button>
              )}
            </div>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#FFE6E7',
              color: '#EA454C',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{error}</span>
              <button 
                onClick={fetchEmployees}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #EA454C',
                  color: '#EA454C',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* SCROLLABLE CONTENT SECTION */}
        {filteredEmployees.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '15px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
              {searchTerm || departmentFilter !== 'all' 
                ? 'No employees match your search criteria' 
                : 'No employees found'}
            </p>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <button 
                onClick={handleAddEmployee}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#40c3d8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Add Your First Employee
              </button>
            )}
          </div>
        ) : (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '10px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
            alignContent: 'start'
          }}>
            {filteredEmployees.map(employee => (
              <div 
                key={employee.id || employee._id} 
                style={{
                  backgroundColor: 'white',
                  borderRadius: '15px',
                  padding: '20px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: employee.avatarColor || '#40c3d8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginRight: '15px',
                    flexShrink: 0
                  }}>
                    {employee.name?.charAt(0) || 'U'}
                  </div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '16px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {employee.name || 'Unknown User'}
                    </h3>
                    <p style={{ 
                      margin: '5px 0', 
                      color: '#666', 
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {employee.email || 'No email'}
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: '15px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#555' }}>Role:</span>
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: employee.role === 'admin' ? '#ffebee' : 
                                     employee.role === 'manager' ? '#e3f2fd' : '#f3e5f5',
                      color: employee.role === 'admin' ? '#EA454C' : 
                            employee.role === 'manager' ? '#1976d2' : '#7b1fa2',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {employee.role || 'employee'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#555' }}>Department:</span>
                    <span style={{ fontSize: '14px' }}>{employee.department || 'General'}</span>
                  </div>
                  {employee.created_at && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#555' }}>Joined:</span>
                      <span style={{ fontSize: '14px' }}>
                        {new Date(employee.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#f5f5f5',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#333'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewSchedule(employee.id || employee._id);
                    }}
                  >
                    View Schedule
                  </button>
                  {(user?.role === 'admin' || (user?.role === 'manager' && employee.role !== 'admin')) && (
                    <button 
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#ffebee',
                        color: '#EA454C',
                        border: '1px solid #EA454C',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditEmployee(employee.id || employee._id);
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeesPage;