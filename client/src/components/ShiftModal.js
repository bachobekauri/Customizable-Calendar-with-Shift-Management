import React, { useState, useEffect } from "react";
import moment from "moment";
import "./ShiftModal.css";
import { settingsService } from '../services/api';

/**
 * Props:
 * - shift: the shift object or null for new
 * - onSave(shiftData): async handler provided by parent
 * - onDelete(shiftId): async handler provided by parent
 * - onClose(): close modal
 * - user: current user (for role/department)
 * - availableUsers: array of employees to assign
 * - isDayMode: boolean - true when modal created from a specific day (time-only inputs)
 * - error: (optional) error string from parent (API errors)
 * - clearError: (optional) function to clear parent error
 */
const ShiftModal = ({
  shift,
  onSave,
  onDelete,
  onClose,
  user,
  availableUsers = [],
  isDayMode = false,
  error: parentError = null,
  clearError = () => {},
}) => {
  const isEditing = !!(shift && shift._id);
  const isManager = user?.role === "manager" || user?.role === "admin";
  const isDaySpecific = isDayMode && !isEditing;

  const [validationError, setValidationError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [defaultSettings, setDefaultSettings] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "", // 'YYYY-MM-DDTHH:mm'
    endTime: "",
    department: user?.department || "General",
    requiredEmployees: 1,
    hourlyRate: 20,
    location: "Main Office",
    status: "published",
    employees: [],
  });

  useEffect(() => {
    const fetchDefaultSettings = async () => {
      try {
        const response = await settingsService.getSettings();
        if (response.data.success) {
          setDefaultSettings(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching default settings:', error);
        setDefaultSettings({
          defaultHourlyRate: 20,
          defaultLocation: 'Main Office',
          defaultShiftHours: 8
        });
      }
    };

    fetchDefaultSettings();
  }, []);

  const normalizeShiftToForm = (s) => {
    const safeStart = s?.startTime ? moment(s.startTime).local() : null;
    const safeEnd = s?.endTime ? moment(s.endTime).local() : null;
    return {
      title: s?.title || "",
      description: s?.description || "",
      startTime: safeStart ? safeStart.format("YYYY-MM-DDTHH:mm") : "",
      endTime: safeEnd ? safeEnd.format("YYYY-MM-DDTHH:mm") : "",
      department: s?.department || user?.department || "General",
      requiredEmployees: s?.requiredEmployees || 1,
      hourlyRate: s?.hourlyRate || (defaultSettings?.defaultHourlyRate || 20),
      location: s?.location || (defaultSettings?.defaultLocation || "Main Office"),
      status: s?.status || "published",
      employees: Array.isArray(s?.employees) ? s.employees.map((e) => (e._id ? e._id : e)) : [],
    };
  };

  useEffect(() => {
    setValidationError(null);
    clearError();

    if (isEditing) {
      const normalized = normalizeShiftToForm(shift || {});
      setFormData(normalized);
      setSelectedEmployees(normalized.employees || []);
    } else if (shift && isDaySpecific) {
      const dateMoment = shift?.startTime ? moment(shift.startTime).local() : moment().local();
      const dateStr = dateMoment.format("YYYY-MM-DD");
      
      const shiftHours = defaultSettings?.defaultShiftHours || 8;
      const startTime = `${dateStr}T09:00`;
      const endMoment = moment(startTime).add(shiftHours, 'hours');
      const endTime = endMoment.format("YYYY-MM-DDTHH:mm");
      
      setFormData((prev) => ({
        ...prev,
        startTime: startTime,
        endTime: endTime,
        department: shift.department || user?.department || prev.department,
        hourlyRate: defaultSettings?.defaultHourlyRate || prev.hourlyRate,
        location: defaultSettings?.defaultLocation || prev.location,
      }));
      setSelectedEmployees([]);
    } else if (shift) {
      const normalized = normalizeShiftToForm(shift);
      setFormData(normalized);
      setSelectedEmployees(normalized.employees || []);
    } else {
      const today = moment().local().format("YYYY-MM-DD");
      const shiftHours = defaultSettings?.defaultShiftHours || 8;
      const startTime = `${today}T09:00`;
      const endMoment = moment(startTime).add(shiftHours, 'hours');
      const endTime = endMoment.format("YYYY-MM-DDTHH:mm");
      
      setFormData({
        title: "",
        description: "",
        startTime: startTime,
        endTime: endTime,
        department: user?.department || "General",
        requiredEmployees: 1,
        hourlyRate: defaultSettings?.defaultHourlyRate || 20,
        location: defaultSettings?.defaultLocation || "Main Office",
        status: "published",
        employees: [],
      });
      setSelectedEmployees([]);
    }
  }, [shift, isDayMode, user?.department, isEditing, defaultSettings]);

  const handleEmployeeToggle = (id) => {
    setSelectedEmployees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    const allIds = availableUsers.map((u) => u._id || u.id);
    setSelectedEmployees((prev) => (prev.length === allIds.length ? [] : allIds));
  };

  const calculateDuration = () => {
    try {
      if (!formData.startTime || !formData.endTime) return 0;
      const start = moment(formData.startTime);
      const end = moment(formData.endTime);
      const hours = end.diff(start, "hours", true);
      return Math.max(0, Math.round(hours * 10) / 10);
    } catch {
      return 0;
    }
  };

  const calculateCost = () => {
    const hours = calculateDuration();
    const rate = Number(formData.hourlyRate) || 0;
    const req = Number(formData.requiredEmployees) || 1;
    return Math.round(hours * rate * req * 100) / 100;
  };

  const handleTimeChange = (field, timeValue) => {
    if (isDaySpecific) {
      const date = formData.startTime ? moment(formData.startTime).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD");
      setFormData((prev) => ({ ...prev, [field]: `${date}T${timeValue}` }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: timeValue }));
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setValidationError(null);
  clearError();
  setLoading(true);

  try {
    if (!formData.title?.trim()) throw new Error("Please enter a title.");
    if (!formData.startTime || !formData.endTime) throw new Error("Please provide start and end times.");

    const start = moment(formData.startTime);
    const end = moment(formData.endTime);

    if (!start.isValid() || !end.isValid()) throw new Error("Invalid date/time format.");
    if (!end.isAfter(start)) throw new Error("End time must be after start time.");

    const payload = {
      ...formData,
      startTime: start.local().format(), // Keep as local time with offset
      endTime: end.local().format(),     // Keep as local time with offset
      employees: selectedEmployees,
    };

    await onSave(payload);
  } catch (err) {
    const message = err?.response?.data?.message || err?.message || String(err);
    setValidationError(message);
  } finally {
    setLoading(false);
  }
};

  // Delete wrapper to show loading while parent handles confirm and deletion
  const handleDeleteClick = async () => {
    setValidationError(null);
    clearError();
    setLoading(true);
    try {
      await onDelete(shift._id);
      // parent closes modal on successful delete
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to delete shift";
      setValidationError(message);
    } finally {
      setLoading(false);
    }
  };

  // Error to display: local validation error takes priority over parent API error
  const displayedError = validationError || parentError;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="shift-modal-title">
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="shift-modal-title">
            {isEditing ? "Edit Shift" : isDaySpecific ? `Add Shift for ${moment(formData.startTime).format("ddd, MMM D")}` : "Create New Shift"}
          </h2>
          <button className="close-btn" onClick={onClose} aria-label="Close modal" disabled={loading}>
            ×
          </button>
        </div>

        {displayedError && (
          <div
            className="modal-error"
            style={{
              backgroundColor: "#FFE6E7",
              color: "#EA454C",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
              border: "1px solid #EA454C"
            }}
            role="alert"
          >
            {displayedError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Shift Title *</label>
            <input
              type="text"
              placeholder="e.g., Morning Shift, Sales Floor"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              required
              disabled={!isManager || loading}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Add shift details..."
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows="3"
              disabled={!isManager || loading}
            />
          </div>

          <div className="form-row">
            {isDaySpecific ? (
              <>
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    value={moment(formData.startTime).isValid() ? moment(formData.startTime).format("HH:mm") : "09:00"}
                    onChange={(e) => handleTimeChange("startTime", e.target.value)}
                    required
                    disabled={!isManager || loading}
                  />
                </div>

                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="time"
                    value={moment(formData.endTime).isValid() ? moment(formData.endTime).format("HH:mm") : "17:00"}
                    onChange={(e) => handleTimeChange("endTime", e.target.value)}
                    required
                    disabled={!isManager || loading}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))}
                    required
                    disabled={!isManager || loading}
                  />
                </div>

                <div className="form-group">
                  <label>End Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))}
                    required
                    disabled={!isManager || loading}
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
                onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                disabled={!isManager || loading}
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
                onChange={(e) => setFormData((p) => ({ ...p, requiredEmployees: parseInt(e.target.value, 10) || 1 }))}
                disabled={!isManager || loading}
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
                onChange={(e) => setFormData((p) => ({ ...p, hourlyRate: parseFloat(e.target.value) || 0 }))}
                disabled={!isManager || loading}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                disabled={!isManager || loading}
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
              onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
              disabled={!isManager || loading}
              placeholder="Main Office"
            />
          </div>

          {isManager && availableUsers.length > 0 && (
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <label>Assign Employees ({selectedEmployees.length} selected)</label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    padding: "6px 10px",
                    backgroundColor: selectedEmployees.length === availableUsers.length ? "#EA454C" : "#40c3d8",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                  disabled={loading}
                >
                  {selectedEmployees.length === availableUsers.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="employee-selector" style={{ maxHeight: 250, overflowY: "auto" }}>
                {availableUsers
                  .filter((emp) => emp.role === "employee" || emp.role === "manager")
                  .map((employee) => {
                    const id = employee._id || employee.id;
                    return (
                      <div key={id} className="employee-option">
                        <input
                          type="checkbox"
                          id={`emp-${id}`}
                          checked={selectedEmployees.includes(id)}
                          onChange={() => handleEmployeeToggle(id)}
                          disabled={loading}
                        />
                        <label htmlFor={`emp-${id}`} style={{ display: "flex", alignItems: "center", width: "100%" }}>
                          <div className="employee-avatar" style={{ backgroundColor: employee.avatarColor || "#40c3d8" }}>
                            {employee.name?.charAt(0) || "E"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{employee.name}</div>
                            <small style={{ color: "#666" }}>
                              {employee.role} • {employee.department}
                            </small>
                          </div>
                        </label>
                      </div>
                    );
                  })}
              </div>

              {selectedEmployees.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 14, color: "#666" }}>
                  Selected: {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}

          <div className="modal-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isManager && isEditing && (
              <button type="button" className="btn-danger" onClick={handleDeleteClick} disabled={loading}>
                {loading ? "Deleting..." : "Delete Shift"}
              </button>
            )}

            <div style={{ flex: 1 }} />

            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>

            {isManager && (
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !formData.title || !formData.startTime || !formData.endTime}
              >
                {loading ? (isEditing ? "Updating..." : "Saving...") : isEditing ? "Update Shift" : "Create Shift"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftModal;