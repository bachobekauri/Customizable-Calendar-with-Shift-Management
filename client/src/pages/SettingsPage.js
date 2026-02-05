import React, { useState, useEffect } from 'react';
import './mainPage.css';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { settingsService } from '../services/api';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsService.getSettings();
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await settingsService.updateSettings(settings);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to save settings' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    if (!window.confirm('This will create a backup of all data. Continue?')) {
      return;
    }

    setMessage(null);
    try {
      const response = await settingsService.backupDatabase();
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Backup created successfully: ${response.data.filename}` 
        });
      }
    } catch (error) {
      console.error('Error backing up database:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to backup database' 
      });
    }
  };

  const handleReset = async () => {
    const firstConfirm = window.confirm(
      '⚠️ WARNING: This will reset ALL data to defaults.\n\n' +
      'All shifts, users (except defaults), and custom settings will be PERMANENTLY DELETED.\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Are you absolutely sure you want to continue?'
    );
    
    if (!firstConfirm) {
      return;
    }

    // Second confirmation with text input
    const userInput = window.prompt(
      'This is your last chance!\n\n' +
      'Type "RESET" in capital letters to confirm:'
    );
    
    if (userInput !== 'RESET') {
      alert('Reset cancelled. The text did not match.');
      return;
    }

    setMessage(null);
    try {
      const response = await settingsService.resetDatabase();
      if (response.data.success) {
        alert('Database reset successfully!\n\nYou will now be logged out.\n\nPlease log in again with default credentials:\n\nAdmin: admin@example.com / admin123');
        logout();
        navigate('/');
      }
    } catch (error) {
      console.error('Error resetting database:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to reset database' 
      });
    }
  };

  if (loading) {
    return (
      <div className="main-container">
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <div>Loading settings...</div>
        </div>
      </div>
    );
  }

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

      <div className="content" style={{ overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>⚙️ System Settings</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: saving ? '#999' : '#40c3d8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {message && (
          <div style={{
            padding: '15px',
            marginBottom: '20px',
            borderRadius: '8px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message.text}
          </div>
        )}

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
                onChange={(e) => setSettings({...settings, defaultShiftHours: parseInt(e.target.value) || 1})}
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
                onChange={(e) => setSettings({...settings, defaultHourlyRate: parseFloat(e.target.value) || 0})}
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
          
          <div style={{ 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <strong>⚠️ Important:</strong> Database operations are permanent. Make sure you understand what you're doing.
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleBackup}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              💾 Backup Database
            </button>
            
            <button
              onClick={handleReset}
              style={{
                padding: '10px 20px',
                backgroundColor: '#EA454C',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              🔄 Reset Database
            </button>
          </div>
          
          <div style={{
            marginTop: '15px',
            fontSize: '13px',
            color: '#666',
            lineHeight: '1.6'
          }}>
            <div><strong>Backup:</strong> Creates a SQL dump file in the backups folder on the server</div>
            <div><strong>Reset:</strong> Deletes all data and recreates default users and settings (requires confirmation)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
