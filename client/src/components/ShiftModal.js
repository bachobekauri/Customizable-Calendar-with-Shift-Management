import React, { useState, useEffect } from 'react';
import moment from 'moment';
import './ShiftModal.css';

const ShiftModal = ({ shift, onSave, onDelete, onClose, user, availableUsers = [], isDayMode = false }) => {
  const isEditing = shift && shift._id;
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isDaySpecific = isDayMode && !isEditing;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    department: user?.department || 'General',
    requiredEmployees: 1,
    hourlyRate: 20,
    location: 'Main Office',
    status: 'published',
    employees: []
  });

  const [loading, setLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  useEffect(() => {
    if (isEditing) {
      // Editing existing shift
      setFormData({
        title: shift.title || '',
        description: shift.description || '',
        startTime: moment(shift.startTime).format('YYYY-MM-DDTHH:mm'),
        endTime: moment(shift.endTime).format('YYYY-MM-DDTHH:mm'),
        department: shift.department || user?.department || 'General',
        requiredEmployees: shift.requiredEmployees || 1,
        hourlyRate: shift.hourlyRate || 20,
        location: shift.location || 'Main Office',
        status: shift.status || 'published',
        employees: shift.employees?.map(e => e._id) || []
      });
      setSelectedEmployees(shift.employees?.map(e => e._id) || []);
    } else if (shift && isDaySpecific) {
      // New shift for specific day - prefill date, show time only
      const date = moment(shift.startTime).format('YYYY-MM-DD');
      setFormData(prev => ({
        ...prev,
        startTime: `${date}T09:00`,
        endTime: `${date}T17:00`,
        department: shift.department || user?.department || 'General'
      }));
    } else if (shift) {
      // New shift from floating button - no prefill
      setFormData(prev => ({
        ...prev,
        startTime: moment(shift.startTime).format('YYYY-MM-DDTHH:mm'),
        endTime: moment(shift.endTime).format('YYYY-MM-DDTHH:mm'),
        department: shift.department || user?.department || 'General'
      }));
    }
  }, [shift, isEditing, user, isDaySpecific]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Convert to proper date objects
      const shiftData = {
        ...formData,
        startTime: new Date(formData.startTime),
        endTime: new Date(formData.endTime),
        employees: selectedEmployees
      };
      
      await onSave(shiftData);
    } catch (error) {
      console.error('Error saving shift:', error);
      alert(error.response?.data?.message || 'Failed to save shift');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === availableUsers.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(availableUsers.map(emp => emp._id || emp.id));
    }
  };

  const calculateDuration = () => {
    if (formData.startTime && formData.endTime) {
      const start = moment(formData.startTime);
      const end = moment(formData.endTime);
      const hours = end.diff(start, 'hours', true);
      return Math.round(hours * 10) / 10;
    }
    return 0;
  };

  const calculateCost = () => {
    const hours = calculateDuration();
    return hours * formData.hourlyRate * formData.requiredEmployees;
  };

  const handleTimeChange = (field, value) => {
    if (isDaySpecific) {
      // For day-specific shifts, only update the time part
      const date = moment(formData.startTime).format('YYYY-MM-DD');
      const newDateTime = `${date}T${value}`;
      setFormData(prev => ({
        ...prev,
        [field]: newDateTime
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            {isEditing ? 'Edit Shift' : 
             isDaySpecific ? 'Add Shift for ' + moment(formData.startTime).format('ddd, MMM D') : 
             'Create New Shift'}
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              disabled={!isManager}
              placeholder="Enter shift title"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
              disabled={!isManager}
              placeholder="Shift description (optional)"
            />
          </div>

          <div className="form-row">
            {isDaySpecific ? (
              <>
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    value={moment(formData.startTime).format('HH:mm')}
                    onChange={(e) => handleTimeChange('startTime', e.target.value)}
                    required
                    disabled={!isManager}
                  />
                </div>

                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="time"
                    value={moment(formData.endTime).format('HH:mm')}
                    onChange={(e) => handleTimeChange('endTime', e.target.value)}
                    required
                    disabled={!isManager}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    required
                    disabled={!isManager}
                  />
                </div>

                <div className="form-group">
                  <label>End Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    required
                    disabled={!isManager}
                  />
                </div>
              </>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Duration</label>
              <div className="readonly-field">{calculateDuration()} hours</div>
            </div>

            <div className="form-group">
              <label>Total Cost</label>
              <div className="readonly-field">${calculateCost().toFixed(2)}</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                disabled={!isManager}
              >
                <option value="General">General</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Development">Development</option>
                <option value="Support">Support</option>
                <option value="Management">Management</option>
              </select>
            </div>

            <div className="form-group">
              <label>Required Employees</label>
              <input
                type="number"
                min="1"
                value={formData.requiredEmployees}
                onChange={(e) => setFormData({...formData, requiredEmployees: parseInt(e.target.value) || 1})}
                disabled={!isManager}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Hourly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 20})}
                disabled={!isManager}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                disabled={!isManager}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              disabled={!isManager}
              placeholder="Main Office"
            />
          </div>

          {isManager && availableUsers.length > 0 && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label>Assign Employees ({selectedEmployees.length} selected)</label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: selectedEmployees.length === availableUsers.length ? '#EA454C' : '#40c3d8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {selectedEmployees.length === availableUsers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              <div className="employee-selector" style={{ maxHeight: '250px' }}>
                {availableUsers
                  .filter(emp => emp.role === 'employee' || emp.role === 'manager')
                  .map(employee => (
                    <div key={employee._id || employee.id} className="employee-option">
                      <input
                        type="checkbox"
                        id={`emp-${employee._id || employee.id}`}
                        checked={selectedEmployees.includes(employee._id || employee.id)}
                        onChange={() => handleEmployeeToggle(employee._id || employee.id)}
                      />
                      <label htmlFor={`emp-${employee._id || employee.id}`} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <div 
                          className="employee-avatar"
                          style={{ backgroundColor: employee.avatarColor || '#40c3d8' }}
                        >
                          {employee.name?.charAt(0) || 'E'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600' }}>{employee.name}</div>
                          <small style={{ color: '#666' }}>{employee.role} • {employee.department}</small>
                        </div>
                      </label>
                    </div>
                  ))}
              </div>
              
              {selectedEmployees.length > 0 && (
                <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                  Selected: {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            {isManager && isEditing && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => onDelete(shift._id)}
                disabled={loading}
              >
                Delete Shift
              </button>
            )}
            
            <div style={{ flex: 1 }} />
            
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            
            {isManager && (
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !formData.title || !formData.startTime || !formData.endTime}
              >
                {loading ? 'Saving...' : isEditing ? 'Update Shift' : 'Create Shift'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftModal;