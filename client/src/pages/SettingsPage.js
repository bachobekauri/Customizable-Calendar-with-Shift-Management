import React, { useState } from 'react';
import './mainPage.css';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const { user, logout, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    companyName: 'Coral LAB',
    defaultShiftHours: 8,
    defaultHourlyRate: 20,
    defaultLocation: 'Main Office',
    emailNotifications: true,
    shiftReminders: true
  });

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

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
              <button className="active">⚙️ Settings</button>
            </>
          ) : (
            <>
              {(isManager || isAdmin) && (
                <button onClick={() => navigate("/employees")}>👥 Employees</button>
              )}

              {(isManager || isAdmin) && (
                <button onClick={() => navigate("/requests")}>📨 Requests</button>
              )}

              {(isManager || isAdmin) && (
                <button onClick={() => navigate("/reports")}>📊 Reports</button>
              )}

              {isAdmin && (
                <button className="active">⚙️ Settings</button>
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

      <div className="content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>⚙️ System Settings</h1>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              backgroundColor: '#40c3d8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            Save Settings
          </button>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>
            General Settings
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Company Name
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Default Shift Hours
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.defaultShiftHours}
                onChange={(e) => setSettings({...settings, defaultShiftHours: parseInt(e.target.value)})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Default Hourly Rate ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.defaultHourlyRate}
                onChange={(e) => setSettings({...settings, defaultHourlyRate: parseFloat(e.target.value)})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Default Location
              </label>
              <input
                type="text"
                value={settings.defaultLocation}
                onChange={(e) => setSettings({...settings, defaultLocation: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
          </div>
          
          <h2 style={{ marginBottom: '20px', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>
            Notification Settings
          </h2>
          
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                style={{ marginRight: '10px', width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: '500' }}>Email Notifications</span>
              <span style={{ marginLeft: '10px', color: '#666', fontSize: '14px' }}>
                Receive email notifications for new shifts and updates
              </span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.shiftReminders}
                onChange={(e) => setSettings({...settings, shiftReminders: e.target.checked})}
                style={{ marginRight: '10px', width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: '500' }}>Shift Reminders</span>
              <span style={{ marginLeft: '10px', color: '#666', fontSize: '14px' }}>
                Send reminders before shifts start
              </span>
            </label>
          </div>
          
          <h2 style={{ marginBottom: '20px', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>
            Database Management
          </h2>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                if (window.confirm('This will backup all data. Continue?')) {
                  alert('Backup initiated successfully!');
                }
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Backup Database
            </button>
            
            <button
              onClick={() => {
                if (window.confirm('This will reset all data to defaults. This action cannot be undone. Continue?')) {
                  alert('Database reset initiated!');
                }
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#EA454C',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Reset Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;