import React, { useState, useEffect, useCallback } from 'react';
import './mainPage.css';
import { useAuth } from '../contexts/AuthContext';
import { shiftService, userService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const ReportsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [reportData, setReportData] = useState({
        totalShifts: 0,
        totalHours: 0,
        totalCost: 0,
        confirmedShifts: 0,
        employees: [],
        departmentStats: []
    });
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: moment().startOf('month').format('YYYY-MM-DD'),
        end: moment().endOf('month').format('YYYY-MM-DD')
    });

    const fetchReportData = useCallback(async () => {
        try {
            setLoading(true);

            const shiftsResponse = await shiftService.getShifts({
                startDate: dateRange.start,
                endDate: dateRange.end
            });

            const shifts = shiftsResponse.data.data || [];

            const employeesResponse = await userService.getUsers();
            const employees = employeesResponse.data.data || [];

            const totalShifts = shifts.length;
            let totalHours = 0;
            let totalCost = 0;
            let confirmedShifts = 0;
            const departmentStats = {};

            shifts.forEach(shift => {
                const duration = moment(shift.endTime).diff(moment(shift.startTime), 'hours', true);
                totalHours += duration;
                totalCost += duration * shift.hourlyRate * shift.requiredEmployees;

                if (shift.confirmedCount >= shift.requiredEmployees) {
                    confirmedShifts++;
                }

                // Department statistics
                const dept = shift.department || 'General';
                if (!departmentStats[dept]) {
                    departmentStats[dept] = { shifts: 0, hours: 0, cost: 0, confirmed: 0 };
                }
                departmentStats[dept].shifts++;
                departmentStats[dept].hours += duration;
                departmentStats[dept].cost += duration * shift.hourlyRate * shift.requiredEmployees;
                if (shift.confirmedCount >= shift.requiredEmployees) {
                    departmentStats[dept].confirmed++;
                }
            });

            // Employee statistics
            const employeeStats = employees.map(emp => {
                const employeeShifts = shifts.filter(shift =>
                    shift.employees?.some(e => e._id === emp.id)
                );
                const empHours = employeeShifts.reduce((sum, shift) => {
                    return sum + moment(shift.endTime).diff(moment(shift.startTime), 'hours', true);
                }, 0);
                const empConfirmed = employeeShifts.filter(shift =>
                    shift.confirmedEmployees?.includes(emp.id)
                ).length;

                return {
                    ...emp,
                    shiftCount: employeeShifts.length,
                    totalHours: empHours,
                    confirmedShifts: empConfirmed
                };
            });

            setReportData({
                totalShifts,
                totalHours: Math.round(totalHours * 10) / 10,
                totalCost: Math.round(totalCost * 100) / 100,
                confirmedShifts,
                employees: employeeStats,
                departmentStats: Object.entries(departmentStats).map(([dept, stats]) => ({
                    department: dept,
                    ...stats,
                    hours: Math.round(stats.hours * 10) / 10,
                    cost: Math.round(stats.cost * 100) / 100,
                    completionRate: Math.round((stats.confirmed / stats.shifts) * 100) || 0
                }))
            });
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    const renderSidebar = () => (
        <aside className="sidebar">
            <div className="logo">Coral LAB</div>
            <nav>
                <button onClick={() => navigate('/main')}>Shifts</button>
                <button onClick={() => navigate('/employees')}>Employees</button>
                <button className="active">Reports</button>
                {user?.role === 'admin' && (
                    <button onClick={() => navigate('/settings')}>Settings</button>
                )}
                <button onClick={logout} style={{ marginTop: 'auto' }}>Logout</button>
            </nav>
            <div className="profile">
                <div>{user?.name}</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>{user?.role}</div>
            </div>
        </aside>
    );

    if (loading) {
        return (
            <div className="main-container">
                {renderSidebar()}
                <div className="content">
                    <div className="loading-spinner">Loading reports...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="main-container">
            {renderSidebar()}

            <div className="content" style={{ overflowY: 'auto', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h1 style={{ margin: 0 }}>Reports & Analytics</h1>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                        />
                        <span>to</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                        />
                        <button
                            onClick={fetchReportData}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#40c3d8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Update
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px',
                    marginBottom: '30px'
                }}>
                    <div style={{
                        backgroundColor: '#e3f2fd',
                        padding: '20px',
                        borderRadius: '12px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>
                            {reportData.totalShifts}
                        </div>
                        <div style={{ color: '#666' }}>Total Shifts</div>
                    </div>

                    <div style={{
                        backgroundColor: '#e8f5e9',
                        padding: '20px',
                        borderRadius: '12px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#388e3c' }}>
                            {reportData.totalHours}h
                        </div>
                        <div style={{ color: '#666' }}>Total Hours</div>
                    </div>

                    <div style={{
                        backgroundColor: '#fff3e0',
                        padding: '20px',
                        borderRadius: '12px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f57c00' }}>
                            ${reportData.totalCost}
                        </div>
                        <div style={{ color: '#666' }}>Total Cost</div>
                    </div>

                    <div style={{
                        backgroundColor: '#f3e5f5',
                        padding: '20px',
                        borderRadius: '12px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7b1fa2' }}>
                            {Math.round((reportData.confirmedShifts / reportData.totalShifts) * 100) || 0}%
                        </div>
                        <div style={{ color: '#666' }}>Completion Rate</div>
                    </div>
                </div>

                {/* Department Statistics */}
                <div style={{ marginBottom: '30px' }}>
                    <h2>Department Performance</h2>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                        {reportData.departmentStats.map(dept => (
                            <div key={dept.department} style={{ marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ fontWeight: 'bold' }}>{dept.department}</span>
                                    <span>{dept.completionRate}% complete</span>
                                </div>
                                <div style={{
                                    height: '10px',
                                    backgroundColor: '#eee',
                                    borderRadius: '5px',
                                    overflow: 'hidden'
                                }}>
                                    <div
                                        style={{
                                            width: `${dept.completionRate}%`,
                                            height: '100%',
                                            backgroundColor: dept.completionRate > 80 ? '#4CAF50' :
                                                dept.completionRate > 50 ? '#ff9800' : '#f44336',
                                            transition: 'width 0.3s'
                                        }}
                                    />
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '12px',
                                    color: '#666',
                                    marginTop: '5px'
                                }}>
                                    <span>{dept.shifts} shifts</span>
                                    <span>{dept.hours} hours</span>
                                    <span>${dept.cost}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Employee Statistics */}
                <div style={{ marginBottom: '30px' }}>
                    <h2>Employee Performance</h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '20px',
                        maxHeight: '500px',
                        overflowY: 'auto',
                        paddingRight: '10px'
                    }}>
                        {reportData.employees.map(emp => (
                            <div key={emp.id} style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                padding: '20px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                                    <div style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        backgroundColor: emp.avatarColor || '#40c3d8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        marginRight: '15px'
                                    }}>
                                        {emp.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{emp.name}</div>
                                        <div style={{ fontSize: '14px', color: '#666' }}>{emp.department}</div>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px',
                                    textAlign: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{emp.shiftCount}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>Shifts</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{Math.round(emp.totalHours * 10) / 10}h</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>Hours</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{emp.confirmedShifts}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>Confirmed</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                                            {emp.shiftCount > 0 ? Math.round((emp.confirmedShifts / emp.shiftCount) * 100) : 0}%
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>Rate</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;