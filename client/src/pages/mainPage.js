import React, { useState, useEffect, useCallback } from "react";
import "./mainPage.css";
import { useAuth } from "../contexts/AuthContext";
import { shiftService } from "../services/api";
import ShiftModal from "../components/ShiftModal";
import moment from "moment";

export default function MainPage() {
  const { user, logout, isManager, isAdmin } = useAuth();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [filter, setFilter] = useState("all");
  const [currentWeek, setCurrentWeek] = useState(moment());
  const [error, setError] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isDayMode, setIsDayMode] = useState(false);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const response = await shiftService.getAvailableUsers();
      if (response.data.success) {
        setAvailableUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  }, []);

  const fetchShifts = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Format the date properly for the API
    const weekStart = moment(currentWeek).startOf('week').format('YYYY-MM-DD');
    const response = await shiftService.getShiftsByWeek(weekStart);
    
    if (response.data.success) {
      // The API returns data as an object with date keys
      const shiftsData = response.data.data;
      
      // Create days array for the week (Monday to Friday)
      const weekDays = [];
      const startOfWeek = moment(currentWeek).startOf('week');
      
      for (let i = 0; i < 5; i++) { // Monday to Friday
        const day = moment(startOfWeek).add(i, 'days');
        const dayKey = day.format('YYYY-MM-DD');
        
        // shiftsData is an object with date keys (from API response)
        // Example: { "2025-12-01": [shift1, shift2], "2025-12-02": [...] }
        const dayShifts = shiftsData[dayKey] || [];
        
        // Filter by department if needed
        let filteredShifts = dayShifts;
        if (filter === 'my' && user?.department) {
          filteredShifts = dayShifts.filter(shift => 
            shift.department === user.department
          );
        }
        
        // Calculate totals for the day
        const totalHours = filteredShifts.reduce((sum, shift) => {
          const start = moment(shift.startTime);
          const end = moment(shift.endTime);
          const duration = end.diff(start, 'hours', true);
          return sum + duration;
        }, 0);
        
        const totalCost = filteredShifts.reduce((sum, shift) => {
          const start = moment(shift.startTime);
          const end = moment(shift.endTime);
          const duration = end.diff(start, 'hours', true);
          const rate = shift.hourlyRate || 0;
          const employees = shift.requiredEmployees || 1;
          return sum + (duration * rate * employees);
        }, 0);
        
        weekDays.push({
          label: day.format('ddd').toUpperCase(),
          day: day.date(),
          date: day.toDate(),
          dateString: dayKey,
          shifts: filteredShifts,
          totalHours: Math.round(totalHours * 10) / 10,
          totalCost: Math.round(totalCost * 100) / 100
        });
      }
      
      setDays(weekDays);
      
      // Debug log to see what we received
      console.log('Shifts by week response:', response.data);
      console.log('Processed week days:', weekDays);
    } else {
      setError('Failed to load shifts');
    }
  } catch (error) {
    console.error('Error fetching shifts:', error);
    console.error('Error details:', error.response?.data);
    setError('Failed to load shifts. Please try again.');
  } finally {
    setLoading(false);
  }
}, [currentWeek, filter, user]);

  useEffect(() => {
    fetchShifts();
    if (isManager) {
      fetchAvailableUsers();
    }
  }, [fetchShifts, fetchAvailableUsers, isManager]);

  const handleShiftClick = (shift) => {
    setSelectedShift(shift);
    setIsDayMode(false);
    setModalOpen(true);
  };

  const handleCreateShift = () => {
    // Floating button - no pre-filled date
    setSelectedShift(null);
    setIsDayMode(false);
    setModalOpen(true);
  };

  const handleDaySpecificCreate = (day) => {
    // Create a new date object for the specific day
    const dayDate = moment(day.date);
    
    setSelectedShift({
      startTime: dayDate.set({ hour: 9, minute: 0, second: 0, millisecond: 0 }).toDate(),
      endTime: dayDate.set({ hour: 17, minute: 0, second: 0, millisecond: 0 }).toDate(),
      date: dayDate.format('YYYY-MM-DD'), // Explicitly set the date
      department: user?.department || 'General'
    });
    setIsDayMode(true);
    setModalOpen(true);
  };

  const handleSaveShift = async (shiftData) => {
  try {
    setError(null);
    
    console.log('Saving shift data:', shiftData);
    
    let response;
    if (selectedShift && selectedShift._id) {
      response = await shiftService.updateShift(selectedShift._id, shiftData);
    } else {
      response = await shiftService.createShift(shiftData);
    }
    
    console.log('Save response:', response.data);
    
    // Close modal first
    setModalOpen(false);
    setSelectedShift(null);
    setIsDayMode(false);
    
    // Navigate to the week of the created shift
    if (shiftData.startTime) {
      const shiftWeek = moment(shiftData.startTime);
      setCurrentWeek(shiftWeek);
      
      // If we're navigating to a different week, the useEffect will trigger fetchShifts
      // If we're staying on the same week, manually refetch
      if (shiftWeek.isSame(currentWeek, 'week')) {
        await fetchShifts();
      }
    } else {
      // If no startTime, just refetch current week
      await fetchShifts();
    }
    
  } catch (error) {
    console.error('Error saving shift:', error);
    const message = error.response?.data?.message || 'Failed to save shift. Please try again.';
    setError(message);
  }
};

  const handleDeleteShift = async (shiftId) => {
    if (window.confirm('Are you sure you want to delete this shift? This action cannot be undone.')) {
      try {
        await shiftService.deleteShift(shiftId);
        setModalOpen(false);
        setSelectedShift(null);
        fetchShifts();
      } catch (error) {
        console.error('Error deleting shift:', error);
        const message = error.response?.data?.message || 'Failed to delete shift. Please try again.';
        setError(message);
      }
    }
  };

  const handleConfirmShift = async (shiftId) => {
    try {
      await shiftService.confirmShift(shiftId);
      fetchShifts();
    } catch (error) {
      console.error('Error confirming shift:', error);
      const message = error.response?.data?.message || 'Failed to confirm shift. Please try again.';
      setError(message);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(moment(currentWeek).subtract(1, 'week'));
  };

  const handleNextWeek = () => {
    setCurrentWeek(moment(currentWeek).add(1, 'week'));
  };

  const handleToday = () => {
    setCurrentWeek(moment());
  };

  const formatTime = (date) => {
    return moment(date).format('HH:mm');
  };

  const formatDuration = (start, end) => {
    const hours = moment(end).diff(moment(start), 'hours', true);
    return `${Math.round(hours * 10) / 10}h`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return '#40c3d8';
      case 'draft': return '#ff9800';
      case 'cancelled': return '#ccc';
      case 'completed': return '#4CAF50';
      default: return '#40c3d8';
    }
  };

  const renderSidebar = () => {
    if (!user) return null;
    
    return (
      <aside className="sidebar">
        <div className="logo">Coral LAB</div>
        <nav>
          <button className="active">Shifts</button>
          
          {/* Only show Employees tab for managers and admins */}
          {(isManager || isAdmin) && (
            <button onClick={() => window.location.href = '/employees'}>Employees</button>
          )}
          
          {/* Only show Reports tab for managers and admins */}
          {(isManager || isAdmin) && (
            <button onClick={() => window.location.href = '/reports'}>Reports</button>
          )}
          
          {/* Only show Settings tab for admins */}
          {isAdmin && (
            <button onClick={() => window.location.href = '/settings'}>Settings</button>
          )}
          
          <button onClick={logout} style={{ marginTop: 'auto' }}>Logout</button>
        </nav>
        <div className="profile">
          <div>{user?.name}</div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>{user?.role}</div>
        </div>
      </aside>
    );
  };

  if (loading && days.length === 0) {
    return (
      <div className="main-container">
        {renderSidebar()}
        <div className="content">
          <div className="loading-spinner">Loading schedule...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      {/* LEFT SIDEBAR */}
      {renderSidebar()}

      
      <div className="content">
        <div className="top-bar">
          <div className="left">
            <button className="chip active">Shift view</button>
            <button className="chip">Staff view</button>
            <button 
              className={`chip ${filter === 'all' ? 'active' : ''}`} 
              onClick={() => setFilter('all')}
            >
              Status: All
            </button>
            <button 
              className={`chip ${filter === 'my' ? 'active' : ''}`} 
              onClick={() => setFilter('my')}
            >
              Team: {user?.department || 'All'}
            </button>
          </div>
          <div className="right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button className="chip" onClick={handlePreviousWeek}>←</button>
              <button className="chip active" onClick={handleToday}>
                {currentWeek.isSame(moment(), 'week') ? 'Current Week' : currentWeek.format('MMM D')}
              </button>
              <button className="chip" onClick={handleNextWeek}>→</button>
            </div>
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
              onClick={() => setError(null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#EA454C',
                cursor: 'pointer',
                fontSize: '20px',
                padding: '0 5px'
              }}
            >
              ×
            </button>
          </div>
        )}

        <div className="calendar-grid">
          {days.map((d) => (
            <div key={`${d.label}-${d.day}`} className="day-column">
              <div className="day-header">
                <div className="weekday">{d.label}</div>
                <div className="daynum">{d.day}</div>
                <div className="meta">
                  {d.totalHours}h • ${d.totalCost.toFixed(2)}
                </div>
              </div>

              {d.shifts.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: '#999',
                  fontSize: '14px',
                  minHeight: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  No shifts scheduled
                </div>
              ) : (
                d.shifts.map((shift) => (
                  <div 
                    key={shift._id} 
                    className="shift-card"
                    onClick={() => handleShiftClick(shift)}
                    style={{ 
                      cursor: 'pointer',
                      borderLeftColor: getStatusColor(shift.status),
                      backgroundColor: shift.status === 'cancelled' ? '#f9f9f9' : '#f9f9fb',
                      opacity: shift.status === 'cancelled' ? 0.7 : 1
                    }}
                  >
                    <div className="time">
                      {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                      {shift.status !== 'published' && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '11px',
                          backgroundColor: getStatusColor(shift.status),
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '10px'
                        }}>
                          {shift.status}
                        </span>
                      )}
                    </div>
                    <div className="meta-row">
                      <span>{formatDuration(shift.startTime, shift.endTime)}</span>
                      <span>${(shift.hourlyRate * shift.requiredEmployees).toFixed(2)}/hr</span>
                    </div>
                    <div className="meta-row">
                      <span>{shift.confirmedCount || 0}/{shift.requiredEmployees} confirmed</span>
                      <span>{shift.department}</span>
                    </div>

                    {shift.employees && shift.employees.length > 0 && (
                      <div className="avatar-row">
                        {shift.employees.slice(0, 3).map((emp, index) => (
                          <div 
                            key={emp._id}
                            className="avatar"
                            style={{ 
                              backgroundColor: emp.avatarColor || '#40c3d8',
                              zIndex: 3 - index,
                              position: 'relative'
                            }}
                            title={`${emp.name} (${emp.role})`}
                          >
                            {emp.name?.charAt(0) || 'E'}
                          </div>
                        ))}
                        {shift.employees.length > 3 && (
                          <div className="avatar small" style={{ zIndex: 0 }}>
                            +{shift.employees.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {user && 
                     shift.employees?.some(e => e._id === user.id) && 
                     !shift.confirmedEmployees?.includes(user.id) && 
                     shift.status === 'published' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmShift(shift._id);
                        }}
                        style={{
                          marginTop: '10px',
                          padding: '6px 12px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          width: '100%',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                      >
                        Confirm Attendance
                      </button>
                    )}
                  </div>
                ))
              )}

              {/* Only show Add Shift button for managers/admins */}
              {(isManager || isAdmin) && (
                <button
                  onClick={() => handleDaySpecificCreate(d)}
                  style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    border: '2px dashed #dee2e6',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '14px',
                    color: '#6c757d',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e9ecef';
                    e.target.style.borderColor = '#adb5bd';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f8f9fa';
                    e.target.style.borderColor = '#dee2e6';
                  }}
                >
                  + Add Shift for {d.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING BUTTON - Only for managers/admins */}
      {(isManager || isAdmin) && (
        <button 
          className="add-btn"
          onClick={handleCreateShift}
          style={{
            position: 'fixed',
            bottom: '25px',
            right: '25px',
            background: '#40c3d8',
            border: 'none',
            width: '60px',
            height: '60px',
            fontSize: '32px',
            borderRadius: '50%',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(64, 195, 216, 0.4)',
            transition: 'all 0.3s',
            zIndex: 100
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 6px 20px rgba(64, 195, 216, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 15px rgba(64, 195, 216, 0.4)';
          }}
          title="Create New Shift"
        >
          ＋
        </button>
      )}

      {modalOpen && (
        <ShiftModal
          shift={selectedShift}
          onSave={handleSaveShift}
          onDelete={handleDeleteShift}
          onClose={() => {
            setModalOpen(false);
            setSelectedShift(null);
            setIsDayMode(false);
            setError(null);
          }}
          user={user}
          availableUsers={availableUsers}
          isDayMode={isDayMode}
        />
      )}
    </div>
  );
}