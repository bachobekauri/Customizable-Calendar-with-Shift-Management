import React, { useState } from "react";
import "./mainPage.css";

export default function MainPage() {

  // Mock data (replace with backend API)
  const days = [
    { label: "MON", day: 22, shifts: [
      { id: 1, time: "09:00–13:00", hours: "4h", cost: "$880", people: 8, confirmed: 8 }
    ]},
    { label: "TUE", day: 23, shifts: [
      { id: 2, time: "08:00–11:30", hours: "3.5h", cost: "$880", people: 8, confirmed: 8 },
      { id: 3, time: "12:00–18:00", hours: "6h", cost: "$880", people: 8, confirmed: 8 }
    ]},
    { label: "WED", day: 24, shifts: [
      { id: 4, time: "08:30–17:30", hours: "9h", cost: "$880", people: 8, confirmed: 8 }
    ]},
    { label: "THU", day: 25, shifts: [
      { id: 5, time: "19:00 (Tue)–12:00 (Wed)", hours: "12.5h", cost: "$880", people: 8, confirmed: 8 }
    ]},
    { label: "FRI", day: 26, shifts: [
      { id: 6, time: "12:30–18:00", hours: "5.5h", cost: "$880", people: 8, confirmed: 8 }
    ]},
  ];

  return (
    <div className="main-container">

      {/* LEFT SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">Coral LAB</div>
        <nav>
          <button className="active">Shifts</button>
          <button>Employees</button>
          <button>Reports</button>
          <button>Settings</button>
        </nav>
        <div className="profile">User</div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="content">

        {/* TOP FILTER BAR */}
        <div className="top-bar">
          <div className="left">
            <button className="chip active">Shift view</button>
            <button className="chip">Staff view</button>
            <button className="chip">Status: All</button>
            <button className="chip">Team: All</button>
            <button className="chip filter">+ Advanced filter</button>
          </div>
          <div className="right">
            <button className="chip active">Week</button>
            <button className="chip">Month</button>
            <button className="chip">Current Week ▼</button>
          </div>
        </div>

        {/* CALENDAR GRID */}
        <div className="calendar-grid">
          
          {days.map((d) => (
            <div key={d.day} className="day-column">
              
              <div className="day-header">
                <div className="weekday">{d.label}</div>
                <div className="daynum">{d.day}</div>
                <div className="meta">12h • $1.2k</div>
              </div>

              {d.shifts.map((shift) => (
                <div key={shift.id} className="shift-card">
                  
                  <div className="time">{shift.time}</div>
                  <div className="meta-row">
                    <span>{shift.hours}</span>
                    <span>{shift.cost}</span>
                  </div>
                  <div className="meta-row">
                    <span>{shift.confirmed}/{shift.people} confirmed</span>
                  </div>

                  <div className="avatar-row">
                    <div className="avatar"></div>
                    <div className="avatar"></div>
                    <div className="avatar small">+6</div>
                  </div>

                </div>
              ))}
            </div>
          ))}

        </div>

      </div>

      {/* FLOATING BUTTON */}
      <button className="add-btn">＋</button>
    </div>
  );
}
