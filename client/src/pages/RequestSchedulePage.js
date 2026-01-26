import React, { useState, useEffect } from 'react';
import './mainPage.css';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const RequestSchedulePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState('swap');
  const [requestReason, setRequestReason] = useState('');
  const [proposedStartTime, setProposedStartTime] = useState('');
  const [proposedEndTime, setProposedEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      // Fetch employee's shifts
      console.log('Fetching employee shifts...');
      const shiftsResponse = await fetch(`${apiUrl}/shifts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json();
        if (shiftsData.data && Array.isArray(shiftsData.data)) {
          // Filter shifts assigned to this employee
          const employeeShifts = shiftsData.data.filter(shift => {
            if (!shift || !shift.employees) return false;
            return shift.employees.some(emp => 
              emp.id === user.id || emp._id === user.id || emp === user.id
            );
          });
          setShifts(employeeShifts);
          console.log('Employee shifts:', employeeShifts.length);
        }
      }

      // Fetch employee's requests
      console.log('Fetching employee requests...');
      const requestsResponse = await fetch(`${apiUrl}/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        if (requestsData.data && Array.isArray(requestsData.data)) {
          // Filter requests made by this employee
          const employeeRequests = requestsData.data.filter(req => 
            req.requested_by === user.id
          );
          setRequests(employeeRequests);
          console.log('Employee requests:', employeeRequests.length);
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedShift) {
      alert('Please select a shift');
      return;
    }
    if (!requestReason.trim()) {
      alert('Please provide a reason');
      return;
    }
    if (requestType === 'change' && (!proposedStartTime || !proposedEndTime)) {
      alert('Please provide proposed times');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const requestBody = {
        requestType,
        shiftId: selectedShift.id || selectedShift._id,
        reason: requestReason,
        proposedStartTime: requestType === 'change' ? proposedStartTime : null,
        proposedEndTime: requestType === 'change' ? proposedEndTime : null
      };

      console.log('Submitting request:', requestBody);

      const response = await fetch(`${apiUrl}/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit request');
      }

      alert('Request submitted successfully!');
      setShowRequestModal(false);
      setRequestReason('');
      setProposedStartTime('');
      setProposedEndTime('');
      setSelectedShift(null);
      setRequestType('swap');
      
      // Refresh requests
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getRequestStatusColor = (status) => {
    switch(status) {
      case 'pending': return { bg: '#fff3cd', text: '#856404' };
      case 'approved': return { bg: '#d4edda', text: '#155724' };
      case 'rejected': return { bg: '#f8d7da', text: '#721c24' };
      case 'cancelled': return { bg: '#e2e3e5', text: '#383d41' };
      default: return { bg: '#f0f0f0', text: '#666' };
    }
  };

  const getRequestTypeLabel = (type) => {
    switch(type) {
      case 'swap': return '🔄 Swap';
      case 'change': return '✏️ Change Time';
      case 'cancel': return '❌ Cancel';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="main-container">
        <aside className="sidebar">
          <div className="logo">Coral LAB</div>
          <nav>
            <button onClick={() => navigate('/main')}>📅 Shifts</button>
            <button className="active">📋 Requests</button>
            <button onClick={() => navigate('/settings')}>⚙️ Settings</button>
            <button onClick={logout} style={{ marginTop: 'auto' }}>🚪 Logout</button>
          </nav>
          <div className="profile">
            <div>{user?.name}</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>{user?.role}</div>
          </div>
        </aside>
        <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <aside className="sidebar">
        <div className="logo">Coral LAB</div>
        <nav>
          <button onClick={() => navigate('/main')} style={{ fontWeight: 'normal' }}>
            📅 Shifts
          </button>
          <button className="active">
            📋 Requests
          </button>
          <button onClick={() => navigate('/settings')} style={{ fontWeight: 'normal' }}>
            ⚙️ Settings
          </button>
          <button onClick={logout} style={{ marginTop: 'auto', fontWeight: 'normal' }}>
            🚪 Logout
          </button>
        </nav>
        <div className="profile">
          <div>{user?.name}</div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>{user?.role}</div>
        </div>
      </aside>

      <div className="content" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* HEADER */}
        <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee', flexShrink: 0 }}>
          <h1 style={{ margin: '0 0 10px 0' }}>📋 Request Schedule Changes</h1>
          <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
            Request to swap, change, or cancel shifts
          </p>

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
        </div>

        {/* CONTENT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1, overflow: 'hidden' }}>
          {/* LEFT: Your Shifts */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
              📅 Your Shifts ({shifts.length})
            </h2>

            {shifts.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                  No shifts assigned
                </p>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                {shifts.map((shift, idx) => {
                  const startTime = shift.start_time || shift.startTime;
                  const endTime = shift.end_time || shift.endTime;

                  return (
                    <div
                      key={shift.id || shift._id || idx}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        borderLeft: '4px solid #40c3d8'
                      }}
                    >
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>
                        {shift.title}
                      </h3>
                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                        <div>
                          📅 {moment(startTime).format('MMM DD, YYYY')}
                        </div>
                        <div>
                          🕐 {moment(startTime).format('HH:mm')} - {moment(endTime).format('HH:mm')}
                        </div>
                        <div>
                          ⏱️ {((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60)).toFixed(1)}h
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedShift(shift);
                          setShowRequestModal(true);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          backgroundColor: '#40c3d8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}
                      >
                        Request Change
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Your Requests */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
              📨 Your Requests ({requests.length})
            </h2>

            {requests.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                  No requests yet
                </p>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                {requests.map((request, idx) => {
                  const colors = getRequestStatusColor(request.status);

                  return (
                    <div
                      key={request.id || request._id || idx}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        borderLeft: '4px solid #ff9800'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                          {getRequestTypeLabel(request.request_type)}
                        </h3>
                        <span style={{
                          padding: '4px 12px',
                          backgroundColor: colors.bg,
                          color: colors.text,
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'capitalize'
                        }}>
                          {request.status}
                        </span>
                      </div>

                      {request.reason && (
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                          <strong>Reason:</strong> {request.reason}
                        </div>
                      )}

                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {moment(request.created_at).format('MMM DD, YYYY HH:mm')}
                      </div>

                      {request.status === 'rejected' && request.rejection_reason && (
                        <div style={{
                          backgroundColor: '#f8d7da',
                          color: '#721c24',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          marginTop: '8px',
                          fontSize: '13px'
                        }}>
                          <strong>Reason:</strong> {request.rejection_reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REQUEST MODAL */}
      {showRequestModal && selectedShift && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* HEADER */}
            <div style={{
              padding: '20px 30px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Request Change</h2>
              <button
                onClick={() => setShowRequestModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>

            {/* CONTENT */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '30px', paddingRight: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <strong>Shift:</strong>
                <div style={{ color: '#666', marginTop: '4px', fontSize: '14px' }}>
                  {selectedShift.title}
                  <br />
                  {moment(selectedShift.start_time || selectedShift.startTime).format('MMM DD, YYYY HH:mm')} - {moment(selectedShift.end_time || selectedShift.endTime).format('HH:mm')}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  Type of Request
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="swap">🔄 Swap with another employee</option>
                  <option value="change">✏️ Change shift time</option>
                  <option value="cancel">❌ Cancel this shift</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  Reason <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Why are you requesting this change?"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    minHeight: '100px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              {requestType === 'change' && (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                      Proposed Start Time <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={proposedStartTime}
                      onChange={(e) => setProposedStartTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                      Proposed End Time <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={proposedEndTime}
                      onChange={(e) => setProposedEndTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* FOOTER */}
            <div style={{
              padding: '20px 30px',
              borderTop: '1px solid #eee',
              display: 'flex',
              gap: '10px',
              flexShrink: 0,
              backgroundColor: '#fafafa'
            }}>
              <button
                onClick={handleSubmitRequest}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#40c3d8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>

              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setSelectedShift(null);
                  setRequestReason('');
                  setProposedStartTime('');
                  setProposedEndTime('');
                  setRequestType('swap');
                }}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestSchedulePage;