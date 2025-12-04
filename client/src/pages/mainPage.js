// src/pages/MainPage.js
import React, { useState, useEffect, useCallback } from "react";
import "./mainPage.css";
import { useAuth } from "../contexts/AuthContext";
import { shiftService } from "../services/api";
import ShiftModal from "../components/ShiftModal";
import moment from "moment";

export default function MainPage() {
  const { user, logout, isManager, isAdmin } = useAuth();

  // State
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [filter, setFilter] = useState("all");
  const [currentWeek, setCurrentWeek] = useState(() => moment().startOf("isoWeek"));
  const [error, setError] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isDayMode, setIsDayMode] = useState(false);

  // Helper to clear error (pass to modal)
  const clearError = () => setError(null);

  // Fetch available users (managers only)
  const fetchAvailableUsers = useCallback(async () => {
    try {
      const response = await shiftService.getAvailableUsers();
      if (response?.data?.success) {
        setAvailableUsers(response.data.data || []);
      }
    } catch (err) {
      console.error("fetchAvailableUsers error:", err?.message || err);
    }
  }, []);

  // Fetch shifts for the week that starts on monday (isoWeek)
  const fetchShifts = useCallback(
    async (weekMoment = currentWeek) => {
      setLoading(true);
      setError(null);

      try {
        const monday = moment(weekMoment).startOf("isoWeek");
        const weekStart = monday.format("YYYY-MM-DD");

        const response = await shiftService.getShiftsByWeek(weekStart);

        if (!response?.data?.success) {
          setDays([]);
          setError(response?.data?.message || "Failed to load shifts");
          return;
        }

        const shiftsData = response.data.data || {};

        const weekDays = [];
        for (let i = 0; i < 5; i++) {
          const dayMoment = moment(monday).add(i, "days");
          const dayKey = dayMoment.format("YYYY-MM-DD");
          const dayShifts = Array.isArray(shiftsData[dayKey]) ? shiftsData[dayKey] : [];

          // Apply department filter if requested
          let filteredShifts = dayShifts;
          if (filter === "my" && user?.department) {
            filteredShifts = dayShifts.filter((s) => s.department === user.department);
          }

          // Totals
          const totalHours = filteredShifts.reduce((acc, shift) => {
            const start = moment(shift.startTime);
            const end = moment(shift.endTime);
            const dur = Math.max(0, end.diff(start, "hours", true));
            return acc + dur;
          }, 0);

          const totalCost = filteredShifts.reduce((acc, shift) => {
            const start = moment(shift.startTime);
            const end = moment(shift.endTime);
            const dur = Math.max(0, end.diff(start, "hours", true));
            const rate = Number(shift.hourlyRate) || 0;
            const employees = Number(shift.requiredEmployees) || 1;
            return acc + dur * rate * employees;
          }, 0);

          weekDays.push({
            label: dayMoment.format("ddd").toUpperCase(),
            day: dayMoment.date(),
            date: dayMoment.toDate(),
            dateString: dayKey,
            shifts: filteredShifts,
            totalHours: Math.round(totalHours * 10) / 10,
            totalCost: Math.round(totalCost * 100) / 100,
          });
        }

        setDays(weekDays);
      } catch (err) {
        console.error("fetchShifts error:", err);
        setError("Failed to load shifts. Please try again.");
        setDays([]);
      } finally {
        setLoading(false);
      }
    },
    [currentWeek, filter, user?.department]
  );

  // Initial load and when dependencies change
  useEffect(() => {
    fetchShifts();
    if (isManager) fetchAvailableUsers();
  }, [fetchShifts, fetchAvailableUsers, isManager]);

  // Shift handlers
  const handleShiftClick = (shift) => {
    setSelectedShift(shift);
    setIsDayMode(false);
    setModalOpen(true);
    clearError();
  };

  const handleCreateShift = () => {
    setSelectedShift(null);
    setIsDayMode(false);
    setModalOpen(true);
    clearError();
  };

  const handleDaySpecificCreate = (day) => {
    const dayDate = moment(day.date);
    const start = dayDate.clone().set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    const end = dayDate.clone().set({ hour: 17, minute: 0, second: 0, millisecond: 0 });

    setSelectedShift({
      startTime: start.toDate(),
      endTime: end.toDate(),
      date: dayDate.format("YYYY-MM-DD"),
      department: user?.department || "General",
    });

    setIsDayMode(true);
    setModalOpen(true);
    clearError();
  };

  const handleSaveShift = async (shiftData) => {
    setError(null);

    try {
      let response;
      if (selectedShift && selectedShift._id) {
        response = await shiftService.updateShift(selectedShift._id, shiftData);
      } else {
        response = await shiftService.createShift(shiftData);
      }

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Failed to save shift");
      }

      // close modal and refresh view
      setModalOpen(false);
      setSelectedShift(null);
      setIsDayMode(false);

      const shiftDate = moment(shiftData.startTime);
      const shiftMondayWeek = shiftDate.clone().startOf("isoWeek");
      const currentMondayWeek = moment(currentWeek).clone().startOf("isoWeek");

      if (!shiftMondayWeek.isSame(currentMondayWeek, "day")) {
        setCurrentWeek(shiftMondayWeek);
        // fetchShifts will run via effect when currentWeek updates
      } else {
        await fetchShifts();
      }
    } catch (err) {
      console.error("handleSaveShift error:", err);
      const message = err?.response?.data?.message || err?.message || "Failed to save shift. Please try again.";
      setError(message);
      // keep modal open for user to retry
    }
  };

  const handleDeleteShift = async (shiftId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this shift? This action cannot be undone."
    );
    if (!confirmed) return;

    setError(null);

    try {
      const response = await shiftService.deleteShift(shiftId);

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Failed to delete shift");
      }

      // Close modal and refresh
      setModalOpen(false);
      setSelectedShift(null);
      await fetchShifts();
    } catch (err) {
      console.error("handleDeleteShift error:", err);
      const message = err?.response?.data?.message || err?.message || "Failed to delete shift. Please try again.";
      setError(message);
      // Keep modal open so user can see the message
    }
  };

  const handleConfirmShift = async (shiftId) => {
    setError(null);
    try {
      await shiftService.confirmShift(shiftId);
      await fetchShifts();
    } catch (err) {
      console.error("handleConfirmShift error:", err);
      const message = err?.response?.data?.message || err?.message || "Failed to confirm shift. Please try again.";
      setError(message);
    }
  };

  // Week navigation - use functional updates and clone to avoid mutating moment in state
  const handlePreviousWeek = () => {
    setCurrentWeek((prev) => moment(prev).clone().subtract(1, "week").startOf("isoWeek"));
  };

  const handleNextWeek = () => {
    setCurrentWeek((prev) => moment(prev).clone().add(1, "week").startOf("isoWeek"));
  };

  const handleToday = () => {
    setCurrentWeek(moment().startOf("isoWeek"));
  };

  // Format helpers
  const formatTime = (date) => moment(date).format("HH:mm");

  const formatDuration = (start, end) => {
    const hours = Math.max(0, moment(end).diff(moment(start), "hours", true));
    return `${Math.round(hours * 10) / 10}h`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "published":
        return "#40c3d8";
      case "draft":
        return "#ff9800";
      case "cancelled":
        return "#ccc";
      case "completed":
        return "#4CAF50";
      default:
        return "#40c3d8";
    }
  };

  // Sidebar renderer
  const renderSidebar = () => {
    if (!user) return null;

    return (
      <aside className="sidebar">
        <div className="logo">Coral LAB</div>
        <nav>
          <button className="active">Shifts</button>

          {(isManager || isAdmin) && (
            <button onClick={() => (window.location.href = "/employees")}>Employees</button>
          )}

          {(isManager || isAdmin) && (
            <button onClick={() => (window.location.href = "/reports")}>Reports</button>
          )}

          {isAdmin && (
            <button onClick={() => (window.location.href = "/settings")}>Settings</button>
          )}

          <button onClick={logout} style={{ marginTop: "auto" }}>
            Logout
          </button>
        </nav>
        <div className="profile">
          <div>{user?.name}</div>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>{user?.role}</div>
        </div>
      </aside>
    );
  };

  // Loading state (initial)
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

  // Render
  return (
    <div className="main-container">
      {renderSidebar()}

      <div className="content">
        <div className="top-bar">
          <div className="left">
            <button className="chip active">Shift view</button>
            <button className="chip">Staff view</button>
            <button className={`chip ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
              Status: All
            </button>
            <button className={`chip ${filter === "my" ? "active" : ""}`} onClick={() => setFilter("my")}>
              Team: {user?.department || "All"}
            </button>
          </div>

          <div className="right">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button className="chip" onClick={handlePreviousWeek}>
                ←
              </button>
              <button className="chip active" onClick={handleToday}>
                {moment(currentWeek).isSame(moment(), "week") ? "Current Week" : moment(currentWeek).format("MMM D")}
              </button>
              <button className="chip" onClick={handleNextWeek}>
                →
              </button>
            </div>
          </div>
        </div>

        {/* Global error (non-modal) */}
        {error && (
          <div
            style={{
              backgroundColor: "#FFE6E7",
              color: "#EA454C",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: "#EA454C",
                cursor: "pointer",
                fontSize: "20px",
                padding: "0 5px",
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
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#999",
                    fontSize: "14px",
                    minHeight: "100px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  No shifts scheduled
                </div>
              ) : (
                d.shifts.map((shift) => (
                  <div
                    key={shift._id}
                    className="shift-card"
                    onClick={() => handleShiftClick(shift)}
                    style={{
                      cursor: "pointer",
                      borderLeftColor: getStatusColor(shift.status),
                      backgroundColor: shift.status === "cancelled" ? "#f9f9f9" : "#f9f9fb",
                      opacity: shift.status === "cancelled" ? 0.7 : 1,
                    }}
                  >
                    <div className="time">
                      {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                      {shift.status !== "published" && (
                        <span
                          style={{
                            marginLeft: "8px",
                            fontSize: "11px",
                            backgroundColor: getStatusColor(shift.status),
                            color: "white",
                            padding: "2px 6px",
                            borderRadius: "10px",
                          }}
                        >
                          {shift.status}
                        </span>
                      )}
                    </div>

                    <div className="meta-row">
                      <span>{formatDuration(shift.startTime, shift.endTime)}</span>
                      <span>${((Number(shift.hourlyRate) || 0) * (Number(shift.requiredEmployees) || 1)).toFixed(2)}/hr</span>
                    </div>

                    <div className="meta-row">
                      <span>{shift.confirmedCount || 0}/{shift.requiredEmployees} confirmed</span>
                      <span>{shift.department}</span>
                    </div>

                    {shift.employees && shift.employees.length > 0 && (
                      <div className="avatar-row">
                        {shift.employees.slice(0, 3).map((emp, index) => (
                          <div
                            key={emp._id || index}
                            className="avatar"
                            style={{
                              backgroundColor: emp.avatarColor || "#40c3d8",
                              zIndex: 3 - index,
                              position: "relative",
                            }}
                            title={`${emp.name} (${emp.role})`}
                          >
                            {emp.name?.charAt(0) || "E"}
                          </div>
                        ))}
                        {shift.employees.length > 3 && <div className="avatar small">+{shift.employees.length - 3}</div>}
                      </div>
                    )}

                    {user &&
                      shift.employees?.some((e) => e._id === user.id) &&
                      !shift.confirmedEmployees?.includes(user.id) &&
                      shift.status === "published" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmShift(shift._id);
                          }}
                          style={{
                            marginTop: "10px",
                            padding: "6px 12px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 600,
                            width: "100%",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => (e.target.style.backgroundColor = "#45a049")}
                          onMouseLeave={(e) => (e.target.style.backgroundColor = "#4CAF50")}
                        >
                          Confirm Attendance
                        </button>
                      )}
                  </div>
                ))
              )}

              {(isManager || isAdmin) && (
                <button
                  onClick={() => handleDaySpecificCreate(d)}
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "#f8f9fa",
                    border: "2px dashed #dee2e6",
                    borderRadius: "10px",
                    cursor: "pointer",
                    width: "100%",
                    fontSize: "14px",
                    color: "#6c757d",
                    fontWeight: 600,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#e9ecef";
                    e.target.style.borderColor = "#adb5bd";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.borderColor = "#dee2e6";
                  }}
                >
                  + Add Shift for {d.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {(isManager || isAdmin) && (
        <button
          className="add-btn"
          onClick={handleCreateShift}
          style={{
            position: "fixed",
            bottom: "25px",
            right: "25px",
            background: "#40c3d8",
            border: "none",
            width: "60px",
            height: "60px",
            fontSize: "32px",
            borderRadius: "50%",
            color: "white",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(64, 195, 216, 0.4)",
            transition: "all 0.3s",
            zIndex: 100,
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "scale(1.1)";
            e.target.style.boxShadow = "0 6px 20px rgba(64, 195, 216, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
            e.target.style.boxShadow = "0 4px 15px rgba(64, 195, 216, 0.4)";
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
            clearError();
          }}
          error={error}
          clearError={clearError}
          user={user}
          availableUsers={availableUsers}
          isDayMode={isDayMode}
        />
      )}
    </div>
  );
}