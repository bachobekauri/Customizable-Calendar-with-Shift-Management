
const db = require('../db');

const formatEmployee = (employee) => {
  return {
    _id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    department: employee.department,
    avatarColor: employee.avatar_color || '#40c3d8',
    phone: employee.phone || '',
    createdAt: employee.created_at
  };
};

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private (Manager/Admin)
exports.getEmployees = async (req, res) => {
  try {
    const employees = await db.allAsync(
      `SELECT id, name, email, role, department, avatar_color, 
              created_at, phone
       FROM users 
       WHERE role IN ('employee', 'manager', 'admin')
       ORDER BY 
         CASE role 
           WHEN 'admin' THEN 1
           WHEN 'manager' THEN 2
           WHEN 'employee' THEN 3
           ELSE 4
         END,
         name ASC`
    );

    const formattedEmployees = employees.map(formatEmployee);

    res.json({
      success: true,
      count: formattedEmployees.length,
      data: formattedEmployees
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching employees'
    });
  }
};

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Private (Manager/Admin)
exports.getEmployee = async (req, res) => {
  try {
    const employee = await db.getAsync(
      `SELECT id, name, email, role, department, avatar_color, 
              created_at, phone
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const shifts = await db.allAsync(
      `SELECT s.id, s.title, s.start_time as startTime, s.end_time as endTime,
              s.status, s.department, s.location, s.hourly_rate as hourlyRate,
              se.confirmed
       FROM shift_employees se
       JOIN shifts s ON se.shift_id = s.id
       WHERE se.employee_id = $1
       ORDER BY s.start_time DESC
       LIMIT 10`,
      [req.params.id]
    );

    const stats = await db.getAsync(
      `SELECT 
        COUNT(*) as totalShifts,
        SUM(
          EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600
        ) as totalHours,
        AVG(s.hourly_rate) as avgHourlyRate,
        SUM(
          CASE WHEN se.confirmed = TRUE THEN 
            (EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600) * s.hourly_rate
          ELSE 0 END
        ) as totalEarnings
       FROM shift_employees se
       JOIN shifts s ON se.shift_id = s.id
       WHERE se.employee_id = $1`,
      [req.params.id]
    );

    const upcomingShifts = await db.allAsync(
      `SELECT s.id, s.title, s.start_time as startTime, s.end_time as endTime,
              s.status, s.department, s.location
       FROM shift_employees se
       JOIN shifts s ON se.shift_id = s.id
       WHERE se.employee_id = $1 
         AND s.start_time > NOW()
         AND s.status = 'published'
       ORDER BY s.start_time ASC
       LIMIT 5`,
      [req.params.id]
    );

    const formattedEmployee = formatEmployee(employee);

    res.json({
      success: true,
      data: {
        ...formattedEmployee,
        recentShifts: shifts.map(shift => ({
          ...shift,
          duration: ((new Date(shift.endTime) - new Date(shift.startTime)) / (1000 * 60 * 60)).toFixed(1)
        })),
        upcomingShifts: upcomingShifts.map(shift => ({
          ...shift,
          duration: ((new Date(shift.endTime) - new Date(shift.startTime)) / (1000 * 60 * 60)).toFixed(1)
        })),
        stats: {
          totalShifts: parseInt(stats.totalshifts) || 0,
          totalHours: Math.round(parseFloat(stats.totalhours) || 0),
          avgHourlyRate: stats.avghourlyrate ? parseFloat(stats.avghourlyrate).toFixed(2) : 0,
          totalEarnings: stats.totalearnings ? parseFloat(stats.totalearnings).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching employee'
    });
  }
};

// @desc    Get employee's shifts
// @route   GET /api/employees/:id/shifts
// @access  Private (Manager/Admin)
exports.getEmployeeShifts = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    let query = `
      SELECT s.id, s.title, s.description, 
             s.start_time as startTime, s.end_time as endTime,
             s.status, s.department, s.location, s.hourly_rate as hourlyRate,
             s.required_employees as requiredEmployees,
             se.confirmed
      FROM shift_employees se
      JOIN shifts s ON se.shift_id = s.id
      WHERE se.employee_id = $1
    `;
    
    const params = [req.params.id];
    let paramIndex = 2;

    if (startDate && endDate) {
      query += ` AND s.start_time >= $${paramIndex} AND s.start_time <= $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    if (status && status !== 'all') {
      query += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY s.start_time DESC`;

    const shifts = await db.allAsync(query, params);

    const formattedShifts = shifts.map(shift => ({
      ...shift,
      duration: ((new Date(shift.endTime) - new Date(shift.startTime)) / (1000 * 60 * 60)).toFixed(1),
      earnings: (shift.hourlyRate * ((new Date(shift.endTime) - new Date(shift.startTime)) / (1000 * 60 * 60))).toFixed(2)
    }));

    const totalShifts = formattedShifts.length;
    const totalHours = formattedShifts.reduce((sum, shift) => sum + parseFloat(shift.duration), 0);
    const totalEarnings = formattedShifts.reduce((sum, shift) => sum + parseFloat(shift.earnings), 0);
    const confirmedShifts = formattedShifts.filter(shift => shift.confirmed === true).length;

    res.json({
      success: true,
      count: totalShifts,
      summary: {
        totalShifts,
        totalHours: totalHours.toFixed(1),
        totalEarnings: totalEarnings.toFixed(2),
        confirmedShifts,
        pendingShifts: totalShifts - confirmedShifts
      },
      data: formattedShifts
    });
  } catch (error) {
    console.error('Get employee shifts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching employee shifts'
    });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (Admin only)
exports.updateEmployee = async (req, res) => {
  try {
    const { name, email, role, department, phone, avatarColor } = req.body;

    const employeeExists = await db.getAsync(
      'SELECT id, role FROM users WHERE id = $1',
      [req.params.id]
    );

    if (!employeeExists) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    if (email) {
      const emailExists = await db.getAsync(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.params.id]
      );
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another user'
        });
      }
    }

    if (role && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can change user roles'
      });
    }

    if (role && role !== 'admin' && employeeExists.role === 'admin') {
      const adminCount = await db.getAsync(
        'SELECT COUNT(*) as count FROM users WHERE role = $1',
        ['admin']
      );
      
      if (adminCount.count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the last admin user'
        });
      }
    }

    await db.runAsync(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        department = COALESCE($4, department),
        phone = COALESCE($5, phone),
        avatar_color = COALESCE($6, avatar_color)
       WHERE id = $7`,
      [
        name || employeeExists.name,
        email || employeeExists.email,
        role || employeeExists.role,
        department || employeeExists.department,
        phone || employeeExists.phone,
        avatarColor || employeeExists.avatar_color,
        req.params.id
      ]
    );

    const updatedEmployee = await db.getAsync(
      `SELECT id, name, email, role, department, avatar_color, 
              created_at, phone
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: formatEmployee(updatedEmployee)
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating employee'
    });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin only)
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await db.getAsync(
      'SELECT id, role FROM users WHERE id = $1',
      [req.params.id]
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    if (employee.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    if (employee.role === 'admin') {
      const adminCount = await db.getAsync(
        'SELECT COUNT(*) as count FROM users WHERE role = $1',
        ['admin']
      );
      
      if (adminCount.count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last admin user'
        });
      }
    }

    await db.runAsync('DELETE FROM users WHERE id = $1', [req.params.id]);

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting employee'
    });
  }
};