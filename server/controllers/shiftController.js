
const db = require('../db');

const formatShift = (shift) => {
  return {
    _id: shift.id,
    title: shift.title,
    description: shift.description,
    startTime: shift.start_time,
    endTime: shift.end_time,
    requiredEmployees: shift.required_employees,
    department: shift.department,
    status: shift.status,
    hourlyRate: shift.hourly_rate,
    location: shift.location,
    createdBy: shift.created_by,
    createdByName: shift.created_by_name,
    createdAt: shift.created_at
  };
};

// @desc    Get all shifts
// @route   GET /api/shifts
// @access  Private
exports.getShifts = async (req, res) => {
  try {
    const { startDate, endDate, department, status } = req.query;
    
    let query = `
      SELECT s.*, 
             u.name as created_by_name,
             u.email as created_by_email
      FROM shifts s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (startDate && endDate) {
      query += ` AND s.start_time >= $${paramIndex} AND s.start_time <= $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    if (department && department !== 'all') {
      query += ` AND s.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    if (status && status !== 'all') {
      query += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (req.user.role === 'employee') {
      query += `
        AND s.id IN (
          SELECT shift_id 
          FROM shift_employees 
          WHERE employee_id = $${paramIndex}
        )
      `;
      params.push(req.user.id);
      paramIndex++;
    }

    query += ` ORDER BY s.start_time ASC`;

    const shifts = await db.allAsync(query, params);

    const shiftsWithEmployees = await Promise.all(
      shifts.map(async (shift) => {
        const employees = await db.allAsync(
          `SELECT u.id, u.name, u.email, u.role, u.department, u.avatar_color as avatarColor, 
                  se.confirmed
           FROM shift_employees se
           JOIN users u ON se.employee_id = u.id
           WHERE se.shift_id = $1`,
          [shift.id]
        );

        const confirmedEmployees = employees.filter(emp => emp.confirmed === true);

        return {
          ...formatShift(shift),
          employees: employees.map(emp => ({
            _id: emp.id,
            name: emp.name,
            email: emp.email,
            role: emp.role,
            department: emp.department,
            avatarColor: emp.avatarColor
          })),
          confirmedEmployees: confirmedEmployees.map(emp => emp.id),
          confirmedCount: confirmedEmployees.length
        };
      })
    );

    res.json({
      success: true,
      count: shiftsWithEmployees.length,
      data: shiftsWithEmployees
    });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching shifts'
    });
  }
};

// @desc    Get single shift
// @route   GET /api/shifts/:id
// @access  Private
exports.getShift = async (req, res) => {
  try {
    const shift = await db.getAsync(
      `SELECT s.*, 
              u.name as created_by_name,
              u.email as created_by_email,
              u.role as created_by_role
       FROM shifts s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    const employees = await db.allAsync(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.avatar_color as avatarColor, 
              se.confirmed
       FROM shift_employees se
       JOIN users u ON se.employee_id = u.id
       WHERE se.shift_id = $1`,
      [shift.id]
    );

    const confirmedEmployees = employees.filter(emp => emp.confirmed === true);

    const shiftWithEmployees = {
      ...formatShift(shift),
      employees: employees.map(emp => ({
        _id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        department: emp.department,
        avatarColor: emp.avatarColor
      })),
      confirmedEmployees: confirmedEmployees.map(emp => emp.id),
      confirmedCount: confirmedEmployees.length
    };

    res.json({
      success: true,
      data: shiftWithEmployees
    });
  } catch (error) {
    console.error('Get shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching shift'
    });
  }
};

// @desc    Create shift
// @route   POST /api/shifts
// @access  Private (Manager/Admin)
exports.createShift = async (req, res) => {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      requiredEmployees,
      department,
      status,
      hourlyRate,
      location,
      employees = []
    } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, start time, and end time are required'
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    const result = await db.runAsync(
      `INSERT INTO shifts (
        title, description, start_time, end_time, required_employees,
        department, status, hourly_rate, location, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        title,
        description || '',
        startTime,
        endTime,
        requiredEmployees || 1,
        department || 'General',
        status || 'published',
        hourlyRate || 20.0,
        location || 'Main Office',
        req.user.id
      ]
    );

    if (employees.length > 0) {
      for (const employeeId of employees) {
        await db.runAsync(
          `INSERT INTO shift_employees (shift_id, employee_id, confirmed)
           VALUES ($1, $2, FALSE)
           ON CONFLICT (shift_id, employee_id) DO NOTHING`,
          [result.id, employeeId]
        );
      }
    }

    const shift = await db.getAsync(
      `SELECT s.*, 
              u.name as created_by_name,
              u.email as created_by_email
       FROM shifts s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1`,
      [result.id]
    );

    const shiftEmployees = await db.allAsync(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.avatar_color as avatarColor, 
              se.confirmed
       FROM shift_employees se
       JOIN users u ON se.employee_id = u.id
       WHERE se.shift_id = $1`,
      [result.id]
    );

    const confirmedEmployees = shiftEmployees.filter(emp => emp.confirmed === true);

    const shiftWithEmployees = {
      ...formatShift(shift),
      employees: shiftEmployees.map(emp => ({
        _id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        department: emp.department,
        avatarColor: emp.avatarColor
      })),
      confirmedEmployees: confirmedEmployees.map(emp => emp.id),
      confirmedCount: confirmedEmployees.length
    };

    res.status(201).json({
      success: true,
      data: shiftWithEmployees
    });
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating shift'
    });
  }
};

// @desc    Update shift
// @route   PUT /api/shifts/:id
// @access  Private (Manager/Admin)
exports.updateShift = async (req, res) => {
  try {
    const shift = await db.getAsync(
      'SELECT * FROM shifts WHERE id = $1',
      [req.params.id]
    );

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    if (req.user.role !== 'admin' && shift.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this shift'
      });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      requiredEmployees,
      department,
      status,
      hourlyRate,
      location,
      employees
    } = req.body;

    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
      }
    }

    await db.runAsync(
      `UPDATE shifts SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        required_employees = COALESCE($5, required_employees),
        department = COALESCE($6, department),
        status = COALESCE($7, status),
        hourly_rate = COALESCE($8, hourly_rate),
        location = COALESCE($9, location)
       WHERE id = $10`,
      [
        title || shift.title,
        description || shift.description,
        startTime || shift.start_time,
        endTime || shift.end_time,
        requiredEmployees || shift.required_employees,
        department || shift.department,
        status || shift.status,
        hourlyRate || shift.hourly_rate,
        location || shift.location,
        req.params.id
      ]
    );

    if (employees && Array.isArray(employees)) {
      await db.runAsync(
        'DELETE FROM shift_employees WHERE shift_id = $1',
        [req.params.id]
      );

      if (employees.length > 0) {
        for (const employeeId of employees) {
          await db.runAsync(
            `INSERT INTO shift_employees (shift_id, employee_id, confirmed)
             VALUES ($1, $2, FALSE)
             ON CONFLICT (shift_id, employee_id) DO NOTHING`,
            [req.params.id, employeeId]
          );
        }
      }
    }

    const updatedShift = await db.getAsync(
      `SELECT s.*, 
              u.name as created_by_name,
              u.email as created_by_email
       FROM shifts s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    const shiftEmployees = await db.allAsync(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.avatar_color as avatarColor, 
              se.confirmed
       FROM shift_employees se
       JOIN users u ON se.employee_id = u.id
       WHERE se.shift_id = $1`,
      [req.params.id]
    );

    const confirmedEmployees = shiftEmployees.filter(emp => emp.confirmed === true);

    const shiftWithEmployees = {
      ...formatShift(updatedShift),
      employees: shiftEmployees.map(emp => ({
        _id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        department: emp.department,
        avatarColor: emp.avatarColor
      })),
      confirmedEmployees: confirmedEmployees.map(emp => emp.id),
      confirmedCount: confirmedEmployees.length
    };

    res.json({
      success: true,
      data: shiftWithEmployees
    });
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating shift'
    });
  }
};

// @desc    Delete shift
// @route   DELETE /api/shifts/:id
// @access  Private (Manager/Admin)
exports.deleteShift = async (req, res) => {
  try {
    const shift = await db.getAsync(
      'SELECT * FROM shifts WHERE id = $1',
      [req.params.id]
    );

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    if (!['admin', 'manager'].includes(req.user.role) && shift.created_by !== req.user.id) {
  return res.status(403).json({
    success: false,
    message: 'Not authorized to delete this shift'
  });
}


    await db.runAsync('DELETE FROM shifts WHERE id = $1', [req.params.id]);

    res.json({
      success: true,
      message: 'Shift deleted successfully'
    });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting shift'
    });
  }
};

// @desc    Get shifts by week - FIXED VERSION
// @route   GET /api/shifts/week/:date
// @access  Private
exports.getShiftsByWeek = async (req, res) => {
  try {
    console.log('Getting shifts for week starting:', req.params.date);
    
    const date = req.params.date || new Date().toISOString().split('T')[0];
    
    const inputDate = new Date(date + 'T00:00:00.000Z');
    
    const dayOfWeek = inputDate.getUTCDay();
    
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const monday = new Date(inputDate);
    monday.setUTCDate(inputDate.getUTCDate() - daysToMonday);
    monday.setUTCHours(0, 0, 0, 0);
    
    const friday = new Date(monday);
    friday.setUTCDate(monday.getUTCDate() + 4);
    friday.setUTCHours(23, 59, 59, 999);

    console.log('Week range:', {
      monday: monday.toISOString(),
      friday: friday.toISOString()
    });

    let query = `
      SELECT s.*, 
             u.name as created_by_name,
             u.email as created_by_email
      FROM shifts s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.start_time >= $1 
        AND s.start_time <= $2
    `;
    const params = [monday.toISOString(), friday.toISOString()];
    let paramIndex = 3;

    if (req.user.role === 'employee') {
      query += `
        AND s.id IN (
          SELECT shift_id 
          FROM shift_employees 
          WHERE employee_id = $${paramIndex}
        )
      `;
      params.push(req.user.id);
      paramIndex++;
    }

    query += ` ORDER BY s.start_time ASC`;

    const shifts = await db.allAsync(query, params);
    
    console.log(`Found ${shifts.length} shifts for the week`);

    const shiftsWithEmployees = await Promise.all(
      shifts.map(async (shift) => {
        const employees = await db.allAsync(
          `SELECT u.id, u.name, u.email, u.role, u.department, u.avatar_color as avatarColor, 
                  se.confirmed
           FROM shift_employees se
           JOIN users u ON se.employee_id = u.id
           WHERE se.shift_id = $1`,
          [shift.id]
        );

        const confirmedEmployees = employees.filter(emp => emp.confirmed === true);

        return {
          ...formatShift(shift),
          employees: employees.map(emp => ({
            _id: emp.id,
            name: emp.name,
            email: emp.email,
            role: emp.role,
            department: emp.department,
            avatarColor: emp.avatarColor
          })),
          confirmedEmployees: confirmedEmployees.map(emp => emp.id),
          confirmedCount: confirmedEmployees.length
        };
      })
    );

    const shiftsByDay = {};
    
    for (let i = 0; i < 5; i++) {
      const day = new Date(monday);
      day.setUTCDate(monday.getUTCDate() + i);
      const dayKey = day.toISOString().split('T')[0];
      shiftsByDay[dayKey] = [];
    }
    
    shiftsWithEmployees.forEach(shift => {
      const shiftDate = new Date(shift.startTime);
      const dayKey = shiftDate.toISOString().split('T')[0];
      
      if (shiftsByDay[dayKey]) {
        shiftsByDay[dayKey].push(shift);
      }
    });

    console.log('Shifts grouped by day:', Object.keys(shiftsByDay).map(day => ({
      day,
      count: shiftsByDay[day].length
    })));

    res.json({
      success: true,
      data: shiftsByDay,
      weekStart: monday.toISOString(),
      weekEnd: friday.toISOString()
    });
  } catch (error) {
    console.error('Get shifts by week error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching shifts by week: ' + error.message
    });
  }
};

// @desc    Confirm shift attendance
// @route   POST /api/shifts/:id/confirm
// @access  Private
exports.confirmShift = async (req, res) => {
  try {
    const assignment = await db.getAsync(
      `SELECT se.* 
       FROM shift_employees se
       JOIN shifts s ON se.shift_id = s.id
       WHERE se.shift_id = $1 AND se.employee_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this shift'
      });
    }

    const shift = await db.getAsync(
      'SELECT * FROM shifts WHERE id = $1',
      [req.params.id]
    );

    if (shift.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot confirm a cancelled shift'
      });
    }

    if (assignment.confirmed === true) {
      return res.status(400).json({
        success: false,
        message: 'Already confirmed for this shift'
      });
    }

    await db.runAsync(
      'UPDATE shift_employees SET confirmed = TRUE WHERE shift_id = $1 AND employee_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Shift confirmed successfully'
    });
  } catch (error) {
    console.error('Confirm shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error confirming shift'
    });
  }
};

// @desc    Get all users (for shift assignment)
// @route   GET /api/shifts/users/available
// @access  Private (Manager/Admin)
exports.getAvailableUsers = async (req, res) => {
  try {
    const users = await db.allAsync(
      `SELECT id, name, email, role, department, avatar_color as avatarColor 
       FROM users 
       WHERE role IN ('employee', 'manager')
       ORDER BY name ASC`
    );

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get available users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
};