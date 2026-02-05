import React, { useState, useEffect } from 'react';
import './mainPage.css';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const RequestsPage = () => {
  const { user, logout, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [replacementOptions, setReplacementOptions] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch requests: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setRequests(data.data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    if (selectedRequest.request_type === 'swap' && !selectedReplacement) {
      alert('Please select a replacement employee');
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/requests/${selectedRequest.id || selectedRequest._id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          replacementEmployeeId: selectedReplacement?.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      setShowModal(false);
      setSelectedRequest(null);
      setSelectedReplacement(null);
      setRejectionReason('');
      fetchRequests();
      alert('Request approved successfully!');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/requests/${selectedRequest.id || selectedRequest._id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectionReason })
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      setShowModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
      alert('Request rejected successfully!');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openRequestModal = async (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setSelectedReplacement(null);
    setShowModal(true);

    if (request.request_type === 'swap') {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${apiUrl}/requests/shift/${request.shift_id}/available`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setReplacementOptions(data.data || []);
        }
      } catch (error) {
        console.error('Error:', error);
        setReplacementOptions([]);
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': { bg: '#fff3cd', text: '#856404' },
      'approved': { bg: '#d4edda', text: '#155724' },
      'rejected': { bg: '#f8d7da', text: '#721c24' },
      'cancelled': { bg: '#e2e3e5', text: '#383d41' }
    };
    return colors[status] || { bg: '#f0f0f0', text: '#666' };
  };

  const renderRequestCard = (request) => (
    <div
      key={request.id || request._id}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderLeft: `4px solid ${
          request.status === 'pending' ? '#ff9800' :
          request.status === 'approved' ? '#4CAF50' :
          request.status === 'rejected' ? '#f44336' : '#999'
        }`
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: '#e3f2fd',
              color: '#1976d2'
            }}>
              {request.request_type?.toUpperCase() || 'REQUEST'}
            </span>
            <span style={{
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: getStatusColor(request.status).bg,
              color: getStatusColor(request.status).text
            }}>
              {request.status?.toUpperCase()}
            </span>
          </div>

          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>
            {request.title || 'Shift Request'}
          </h3>

          <div style={{ fontSize: '14px', color: '#666' }}>
            <div><strong>By:</strong> {request.requestedbyname || 'Unknown'}</div>
            {request.start_time && (
              <div><strong>Time:</strong> {moment(request.start_time).format('MMM DD, HH:mm')} - {moment(request.end_time).format('HH:mm')}</div>
            )}
            {request.reason && (
              <div style={{ marginTop: '8px', backgroundColor: '#f9f9f9', padding: '8px 12px', borderRadius: '4px', fontSize: '13px' }}>
                <strong>Reason:</strong> {request.reason}
              </div>
            )}
          </div>
        </div>

        {request.status === 'pending' && (
          <button
            onClick={() => openRequestModal(request)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#40c3d8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              marginLeft: '16px'
            }}
          >
            Review
          </button>
        )}
      </div>

      <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
        {moment(request.created_at).fromNow()}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="main-container">
        <aside className="sidebar">
          <div className="logo">Coral LAB</div>
          <nav>
            <button onClick={() => navigate('/main')}>📅 Shifts</button>

            {user?.role === 'employee' ? (
              <>
                <button onClick={() => navigate('/employees')}>👥 Team</button>
                <button onClick={() => navigate('/request-schedule')}>📋 Requests</button>
                <button onClick={() => navigate('/settings')}>⚙️ Settings</button>
              </>
            ) : (
              <>
                {(isManager || isAdmin) && (
                  <button onClick={() => navigate("/employees")}>👥 Employees</button>
                )}

                {(isManager || isAdmin) && (
                  <button className="active">📨 Requests</button>
                )}

                {(isManager || isAdmin) && (
                  <button onClick={() => navigate("/reports")}>📊 Reports</button>
                )}

                {isAdmin && (
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
          <div>Loading requests...</div>
        </div>
      </div>
    );
  }

  const filteredRequests = requests.filter(req => {
    const statusMatch = statusFilter === 'all' || req.status === statusFilter;
    const typeMatch = typeFilter === 'all' || req.request_type === typeFilter;
    return statusMatch && typeMatch;
  });

  return (
    <div className="main-container">
      <aside className="sidebar">
        <div className="logo">Coral LAB</div>
        <nav>
          <button onClick={() => navigate('/main')}>📅 Shifts</button>

          {user?.role === 'employee' ? (
            <>
              <button onClick={() => navigate('/employees')}>👥 Team</button>
              <button onClick={() => navigate('/request-schedule')}>📋 Requests</button>
              <button onClick={() => navigate('/settings')}>⚙️ Settings</button>
            </>
          ) : (
            <>
              {(isManager || isAdmin) && (
                <button onClick={() => navigate("/employees")}>👥 Employees</button>
              )}

              {(isManager || isAdmin) && (
                <button className="active">📨 Requests</button>
              )}

              {(isManager || isAdmin) && (
                <button onClick={() => navigate("/reports")}>📊 Reports</button>
              )}

              {isAdmin && (
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

      <div className="content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 0 30px 0', borderBottom: '1px solid #eee', flexShrink: 0 }}>
          <h1 style={{ margin: '0 0 20px 0' }}>📨 Shift Change Requests</h1>

          {error && (
            <div style={{
              backgroundColor: '#FFE6E7',
              color: '#EA454C',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{error}</span>
              <button onClick={fetchRequests} style={{
                background: 'transparent',
                border: '1px solid #EA454C',
                color: '#EA454C',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}>
                Retry
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Types</option>
              <option value="swap">Swap</option>
              <option value="change">Change</option>
              <option value="cancel">Cancel</option>
            </select>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
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
            <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
              {statusFilter === 'pending' ? 'No pending requests' : 'No requests found'}
            </p>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
            {filteredRequests.map(renderRequestCard)}
          </div>
        )}
      </div>

      {showModal && selectedRequest && (
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
            maxWidth: '600px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '20px 30px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Review Request</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '0',
                  lineHeight: '1',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '30px',
              paddingRight: '20px'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <strong>Request Type:</strong>
                <div style={{ color: '#666', marginTop: '4px', textTransform: 'uppercase', fontSize: '14px', fontWeight: '600' }}>
                  {selectedRequest.request_type}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <strong>Requested By:</strong>
                <div style={{ color: '#666', marginTop: '4px' }}>{selectedRequest.requestedbyname}</div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <strong>Shift:</strong>
                <div style={{ color: '#666', marginTop: '4px' }}>
                  {selectedRequest.title}
                  <br />
                  {selectedRequest.start_time && (
                    <>
                      {moment(selectedRequest.start_time).format('MMM DD, YYYY HH:mm')}
                      {' - '}
                      {moment(selectedRequest.end_time).format('HH:mm')}
                    </>
                  )}
                </div>
              </div>

              {selectedRequest.reason && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Reason:</strong>
                  <div style={{ color: '#666', marginTop: '4px' }}>{selectedRequest.reason}</div>
                </div>
              )}

              {selectedRequest.request_type === 'swap' && replacementOptions.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Select Replacement:</strong>
                  <div style={{ marginTop: '10px' }}>
                    {replacementOptions.map(emp => (
                      <div
                        key={emp.id || emp._id}
                        onClick={() => setSelectedReplacement(emp)}
                        style={{
                          padding: '12px',
                          border: selectedReplacement?.id === emp.id ? '2px solid #40c3d8' : '1px solid #ddd',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          cursor: 'pointer',
                          backgroundColor: selectedReplacement?.id === emp.id ? '#e8f7f9' : 'white',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{emp.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{emp.email}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  Rejection Reason (optional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide reason if rejecting..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    minHeight: '80px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {selectedRequest.status === 'pending' && (
              <div style={{
                padding: '20px 30px',
                borderTop: '1px solid #eee',
                display: 'flex',
                gap: '10px',
                flexShrink: 0,
                backgroundColor: '#fafafa'
              }}>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading || (selectedRequest.request_type === 'swap' && !selectedReplacement)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Approve'}
                </button>

                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Reject'}
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage;