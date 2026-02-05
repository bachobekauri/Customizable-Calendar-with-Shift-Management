const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, role } = require('../middleware/authMiddleware');

// GET all settings
router.get('/', protect, async (req, res) => {
  try {
    const settings = await db.allAsync('SELECT key, value FROM settings');
    
    const settingsObj = settings.reduce((acc, setting) => {
      let value = setting.value;
      
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      
      if (!isNaN(value) && value !== '') {
        value = parseFloat(value);
      }
      
      acc[setting.key] = value;
      return acc;
    }, {});
    
    res.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// UPDATE settings (admin only)
router.put('/', protect, role('admin'), async (req, res) => {
  try {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      const stringValue = typeof value === 'boolean' ? value.toString() : String(value);
      
      await db.runAsync(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP) 
         ON CONFLICT (key) 
         DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, stringValue]
      );
    }
    
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

// RESET database (admin only) - triggers reset-db.js
router.post('/reset-database', protect, role('admin'), async (req, res) => {
  try {
    const { exec } = require('child_process');
    const path = require('path');
    
    const scriptPath = path.join(__dirname, '..', 'reset-db.js');
    
    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Database reset error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to reset database',
          error: error.message 
        });
      }
      
      console.log('Database reset output:', stdout);
      if (stderr) console.error('Database reset stderr:', stderr);
      
      res.json({ 
        success: true, 
        message: 'Database reset successfully. Please log in again.',
        output: stdout 
      });
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    res.status(500).json({ success: false, message: 'Failed to reset database' });
  }
});

// BACKUP database (admin only) - creates a SQL dump
router.post('/backup-database', protect, role('admin'), async (req, res) => {
  try {
    const { exec } = require('child_process');
    const path = require('path');
    const fs = require('fs');
    
    // Create backups directory if it doesn't exist
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
    
    const dbName = process.env.PG_DATABASE || 'shift_calendar';
    const dbUser = process.env.PG_USER || 'postgres';
    const dbHost = process.env.PG_HOST || 'localhost';
    const dbPort = process.env.PG_PORT || 5432;
    const dbPassword = process.env.PG_PASSWORD || 'postgres';
    
    // Use pg_dump to create backup
    const command = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backupFile}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Backup error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to backup database. Make sure pg_dump is installed.',
          error: error.message 
        });
      }
      
      console.log('Backup created:', backupFile);
      
      res.json({ 
        success: true, 
        message: 'Database backed up successfully',
        filename: path.basename(backupFile),
        path: backupFile
      });
    });
  } catch (error) {
    console.error('Error backing up database:', error);
    res.status(500).json({ success: false, message: 'Failed to backup database' });
  }
});

module.exports = router;