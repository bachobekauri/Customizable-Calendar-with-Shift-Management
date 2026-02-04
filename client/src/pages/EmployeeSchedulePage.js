import React, { useState, useEffect } from 'react';
import './mainPage.css';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';

const EmployeeSchedulePage = () => {
  const { user, logout } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('calendar');
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      console.log('🔄 Fetching employee data for ID:', id);
      const empResponse = await fetch(`${apiUrl}/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!empResponse.ok) {
        throw new Error(`Failed to fetch employee: ${empResponse.status}`);
      }

      const empData = await empResponse.json();
      console.log('✓ Employee data:', empData.data);
      setEmployee(empData.data);

      console.log('🔄 Fetching shifts...');
      let shiftsData = [];

      try {
        console.log('  Trying /employees/' + id + '/shifts');
        const empShiftsResponse = await fetch(`${apiUrl}/employees/${id}/shifts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (empShiftsResponse.ok) {
          const empShiftsData = await empShiftsResponse.json();
          if (empShiftsData.data && Array.isArray(empShiftsData.data)) {
            shiftsData = empShiftsData.data;
            console.log('✓ Found shifts via /employees/:id/shifts -', shiftsData.length, 'shifts');
          }
        }
      } catch (e) {
        console.warn('  /employees/:id/shifts failed:', e.message);
      }

      if (shiftsData.length === 0) {
        try {
          console.log('  Trying /shifts (fetch all and filter)');
          const allShiftsResponse = await fetch(`${apiUrl}/shifts`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (allShiftsResponse.ok) {
            const allShiftsData = await allShiftsResponse.json();
            console.log('  All shifts response:', allShiftsData);

            if (allShiftsData.data && Array.isArray(allShiftsData.data)) {
              const allShifts = allShiftsData.data;
              console.log('  Total shifts in system:', allShifts.length);

              shiftsData = allShifts.filter(shift => {
                if (!shift) return false;

                if (Array.isArray(shift.employees)) {
                  return shift.employees.some(emp => 
                    (emp && (emp.id === id || emp._id === id || emp === id))
                  );
                }

                if (Array.isArray(shift.employee_ids)) {
                  return shift.employee_ids.includes(id);
                }

                if (shift.employee_id === id) {
                  return true;
                }

                return false;
              });

              console.log('✓ Found shifts via /shifts filter -', shiftsData.length, 'shifts');
            }
          }
        } catch (e) {
          console.warn('  /shifts failed:', e.message);
        }
      }

      if (shiftsData.length > 0) {
        console.log('📊 Sample shift structure:', shiftsData[0]);
      } else {
        console.warn('⚠️ No shifts found for this employee');
        console.log('Debug info:');
        console.log('  Employee ID:', id);
        console.log('  Employee data:', empData.data);
      }

const normalizedShifts = shiftsData.map(shift => {
  console.log('Raw shift:', shift); // Debug: see what properties exist
  
  return {
    ...shift,
    id: shift.id || shift._id,
    startTime: shift.startTime || shift.starttime || shift.start_time,
    endTime: shift.endTime || shift.endtime || shift.end_time,
    title: shift.title || shift.name || 'Untitled Shift',
    hourlyRate: shift.hourlyRate || shift.hourlyrate,
    requiredEmployees: shift.requiredEmployees || shift.requiredemployees,
    location: shift.location || 'Not specified',
    status: shift.status || 'published',
    department: shift.department || 'General',
    confirmedEmployees: shift.confirmedEmployees || []
  };
});

console.log('Normalized shifts:', normalizedShifts);

      setShifts(normalizedShifts);

    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setError(error.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const groupShiftsByDate = () => {
    const grouped = {};
    shifts.forEach(shift => {
      const startTime = shift.startTime || shift.start_time || shift.datetime;
      if (!startTime) return;

      const date = moment(startTime).format('YYYY-MM-DD');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(shift);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="main-container">
        <aside className="sidebar">
          <div className="logo">Coral LAB</div>
          <nav>
            <button onClick={() => navigate('/main')}>Shifts</button>
            <button onClick={() => navigate('/employees')}>Employees</button>
            <button onClick={() => navigate('/reports')}>Reports</button>
            <button onClick={() => navigate('/settings')}>Settings</button>
            <button onClick={logout} style={{ marginTop: 'auto' }}>Logout</button>
          </nav>
          <div className="profile">
            <div>{user?.name}</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>{user?.role}</div>
          </div>
        </aside>
        <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading schedule...</div>
            <div style={{ fontSize: '12px', color: '#999' }}>Check browser console (F12) for details</div>
          </div>
        </div>
      </div>
    );
  }

  const groupedShifts = groupShiftsByDate();

  return (
    <div className="main-container">
      <aside className="sidebar">
        <div className="logo">Coral LAB</div>
        <nav>
          <button onClick={() => navigate('/main')}>Shifts</button>
          <button onClick={() => navigate('/employees')}>Employees</button>
          <button onClick={() => navigate('/reports')}>Reports</button>
          <button onClick={() => navigate('/settings')}>Settings</button>
          <button onClick={logout} style={{ marginTop: 'auto' }}>Logout</button>
        </nav>
        <div className="profile">
          <div>{user?.name}</div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>{user?.role}</div>
        </div>
      </aside>

      <div className="content" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* HEADER */}
        <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <button
              onClick={() => navigate('/employees')}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ← Back
            </button>

            {employee && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  fontWeight: 'bold'
                }}>
                  {employee.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '20px' }}>{employee.name}'s Schedule</h1>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {employee.department} • {employee.role}
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div style={{
              backgroundColor: '#FFE6E7',
              color: '#EA454C',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                padding: '8px 16px',
                backgroundColor: viewMode === 'calendar' ? '#40c3d8' : '#f5f5f5',
                color: viewMode === 'calendar' ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              📅 Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '8px 16px',
                backgroundColor: viewMode === 'list' ? '#40c3d8' : '#f5f5f5',
                color: viewMode === 'list' ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              📋 List
            </button>
          </div>

          <div style={{ fontSize: '13px', color: '#666' }}>
            <strong>Total Assigned: {shifts.length} shifts</strong>
          </div>
        </div>

        {/* CONTENT */}
        {shifts.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '60px 20px',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <p style={{ fontSize: '16px', color: '#666', margin: '0 0 10px 0' }}>
              No shifts assigned
            </p>
            <p style={{ fontSize: '12px', color: '#999', margin: 0, marginBottom: '20px' }}>
              This employee has no shifts in the system
            </p>
            <button
              onClick={fetchEmployeeData}
              style={{
                padding: '8px 16px',
                backgroundColor: '#40c3d8',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              🔄 Refresh
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'list' && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ overflowX: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Date</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Title</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Time</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map((shift, idx) => {
                        const startTime = shift.startTime || shift.starttime || shift.start_time || shift.datetime;
                        const endTime = shift.endTime || shift.endtime || shift.end_time;
                        const title = shift.title || shift.name || 'Untitled Shift';

                        if (!startTime) return null;

                        const duration = shift.endtime 
                          ? ((new Date(shift.endtime) - new Date(shift.starttime)) / (1000 * 60 * 60)).toFixed(1)
                          : 'N/A';

                        return (
                          <tr key={shift.id || shift._id || idx} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '16px', fontSize: '14px' }}>
                              {moment(startTime).format('MMM DD, YYYY')}
                            </td>
                            <td style={{ padding: '16px', fontWeight: '500', fontSize: '14px' }}>
                              {title}
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px' }}>
                              {moment(startTime).format('HH:mm')}
                              {endTime && ' - ' + moment(endTime).format('HH:mm')}
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px' }}>
                              {duration}h
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewMode === 'calendar' && (
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                {Object.entries(groupedShifts).map(([date, dayShifts]) => (
                  <div key={date} style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '16px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>
                      {moment(date).format('dddd, MMMM DD, YYYY')}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {dayShifts.map((shift, idx) => {
                        const startTime = shift.startTime || shift.start_time || shift.datetime;
                        const endTime = shift.endTime || shift.end_time;
                        const title = shift.title || shift.name || 'Untitled Shift';

                        if (!startTime) return null;

                        const duration = endTime 
                          ? ((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60)).toFixed(1)
                          : 'N/A';

                        return (
                          <div
                            key={shift.id || shift._id || idx}
                            style={{
                              padding: '16px',
                              backgroundColor: '#f9f9f9',
                              borderLeft: `4px solid #40c3d8`,
                              borderRadius: '8px'
                            }}
                          >
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#333' }}>
                              {title}
                            </h4>
                            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                              {moment(startTime).format('HH:mm')}
                              {endTime && ' - ' + moment(endTime).format('HH:mm')}
                              {' • '}
                              {duration}h
                            </div>
                            {shift.location && (
                              <div style={{ fontSize: '13px', color: '#999' }}>
                                📍 {shift.location}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeSchedulePage;