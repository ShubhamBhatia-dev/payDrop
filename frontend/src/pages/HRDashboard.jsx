import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { employeeAPI, streamAPI } from '../api/api';
import { createStream, fundSystem, setStreamState, emergencyWithdraw } from '../utils/web3Service';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card, { CardHeader, CardBody } from '../components/Card';
import Input from '../components/Input';
import {
    Wallet, LogOut, Users, TrendingUp, DollarSign, Play, Pause, X,
    Search, Plus, Filter, Download, Settings, Activity, AlertCircle, Mail,
    Upload, FileDown, Lock, Edit2
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './HRDashboard.css';

const HRDashboard = () => {
    const { user, logout, walletAddress, connectWallet, disconnectWallet } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
    const [showCreateStreamModal, setShowCreateStreamModal] = useState(false);
    const [showCreateEmployeeModal, setShowCreateEmployeeModal] = useState(false);
    const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [connectingWallet, setConnectingWallet] = useState(false);

    const [dashboardStats, setDashboardStats] = useState({
        totalEmployees: 0,
        activeStreams: 0,
        contractBalance: 0,
        monthlyPayroll: 0,
    });

    const [employees, setEmployees] = useState([]);
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [empData, streamData] = await Promise.all([
                    employeeAPI.getAll(),
                    streamAPI.getAll()
                ]);

                // Map API data to UI structure
                const formattedEmployees = empData.map(u => ({
                    _id: u._id,
                    id: u.employeeId || u._id,
                    employeeId: u.employeeId,
                    name: u.name,
                    email: u.email,
                    department: u.department || 'N/A',
                    designation: u.designation || 'N/A',
                    walletAddress: u.walletAddress || 'No Wallet',
                    salary: u.salary || 0,
                    status: u.active ? 'active' : 'paused'
                }));
                setEmployees(formattedEmployees);

                // Streams
                setStreams(streamData);

                // Update Stats
                setDashboardStats({
                    totalEmployees: formattedEmployees.length,
                    activeStreams: streamData.filter(s => s.state === 'Active').length,
                    contractBalance: 0, // Will fetch this via web3Service later
                    monthlyPayroll: formattedEmployees.reduce((acc, e) => acc + (Number(e.salary) || 0), 0)
                });
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        if (user && user.role === 'hr') {
            loadData();
        }
    }, [user]);

    const streamData = [
        { month: 'Jan', amount: 380000 },
        { month: 'Feb', amount: 420000 },
        { month: 'Mar', amount: 410000 },
        { month: 'Apr', amount: 450000 },
        { month: 'May', amount: 470000 },
        { month: 'Jun', amount: 450000 },
    ];

    const departmentData = [
        { name: 'Engineering', value: 95, color: '#667eea' },
        { name: 'Marketing', value: 52, color: '#0ea5e9' },
        { name: 'Sales', value: 48, color: '#22c55e' },
        { name: 'Operations', value: 32, color: '#f59e0b' },
        { name: 'HR', value: 20, color: '#ef4444' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleConnectWallet = async () => {
        setConnectingWallet(true);
        const result = await connectWallet();
        if (!result.success) {
            alert(result.error);
        }
        setConnectingWallet(false);
    };

    const handleAddMoney = async (amount) => {
        try {
            await fundSystem(amount);
            alert('Funds added successfully!');
            setShowAddMoneyModal(false);
            // Refresh balance if we had a dedicated state for it
        } catch (error) {
            console.error('Funding failed:', error);
            alert('Funding failed: ' + error.message);
        }
    };

    const handleCreateStream = async (data) => {
        try {
            await createStream(data.walletAddress, data.amount, data.streamType, data.durationOrEndTime);
            alert('Stream created successfully! It will appear in the list once confirmed on-chain.');
            setShowCreateStreamModal(false);
        } catch (error) {
            console.error('Stream creation failed:', error);
            alert('Stream creation failed: ' + error.message);
        }
    };

    const handlePauseStream = async (streamId) => {
        try {
            await setStreamState(streamId, 'Paused');
            alert('Stream paused successfully!');
        } catch (error) {
            console.error('Pause failed:', error);
            alert('Pause failed: ' + error.message);
        }
    };

    const handleResumeStream = async (streamId) => {
        try {
            await setStreamState(streamId, 'Active');
            alert('Stream resumed successfully!');
        } catch (error) {
            console.error('Resume failed:', error);
            alert('Resume failed: ' + error.message);
        }
    };

    const handleCancelStream = async (streamId) => {
        if (!window.confirm('Are you sure you want to cancel this stream? This cannot be undone.')) return;
        try {
            await setStreamState(streamId, 'Cancelled');
            alert('Stream cancelled successfully!');
        } catch (error) {
            console.error('Cancellation failed:', error);
            alert('Cancellation failed: ' + error.message);
        }
    };

    const handleEmergencyWithdraw = async () => {
        if (!window.confirm('EMERGENCY: This will pause all streams and withdraw available funds. Continue?')) return;
        try {
            await emergencyWithdraw();
            alert('Emergency action completed successfully!');
        } catch (error) {
            console.error('Emergency action failed:', error);
            alert('Emergency action failed: ' + error.message);
        }
    };

    const handleCreateEmployee = async (employeeData) => {
        try {
            const data = await employeeAPI.create(employeeData);
            const formattedEmployee = {
                _id: data._id,
                id: data.employeeId || data._id,
                employeeId: data.employeeId,
                name: data.name,
                email: data.email,
                department: data.department || 'N/A',
                designation: data.designation || 'N/A',
                walletAddress: data.walletAddress || 'No Wallet',
                salary: data.salary || 0,

            };
            setEmployees([...employees, formattedEmployee]);
            setShowCreateEmployeeModal(false);
            alert('Employee created successfully!');
        } catch (error) {
            console.error("Failed create employee", error);
            const msg = error.response?.data?.msg || error.response?.data?.errors?.[0]?.msg || error.message;
            alert('Failed to create employee: ' + msg);
        }
    };

    const handleUpdateEmployee = async (id, employeeData) => {
        try {
            const data = await employeeAPI.update(id, employeeData);
            setEmployees(employees.map(emp => emp._id === id ? {
                ...emp,
                name: data.name,
                email: data.email,
                department: data.department,
                designation: data.designation,
                walletAddress: data.walletAddress,
                salary: data.salary,

            } : emp));
            setShowEditEmployeeModal(false);
            setEditingEmployee(null);
            alert('Employee updated successfully!');
        } catch (error) {
            console.error("Failed update employee", error);
            const msg = error.response?.data?.msg || error.response?.data?.errors?.[0]?.msg || error.message;
            alert('Failed to update employee: ' + msg);
        }
    };

    const handleDeleteEmployee = async (id) => {
        if (!window.confirm('Are you sure you want to delete this employee? This will also affect their access.')) return;
        try {
            await employeeAPI.delete(id);
            setEmployees(employees.filter(emp => emp._id !== id));
            alert('Employee deleted successfully!');
        } catch (error) {
            console.error("Failed delete employee", error);
            const msg = error.response?.data?.msg || error.message;
            alert('Failed to delete employee: ' + msg);
        }
    };

    const handleExportExcel = () => {
        // Implement Excel export
        console.log('Exporting employees to Excel...');
        alert('Excel export feature - creating CSV file with employee data');
        // In production, use a library like xlsx or export to CSV
    };

    const handleImportExcel = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            console.log('Importing Excel file:', file.name);
            alert(`Importing file: ${file.name}\nThis will parse the Excel/CSV and add employees to the system.`);
            // In production, parse the file and add employees
        }
    };

    const getEmployeeNameByWallet = (address) => {
        if (!address) return 'Unknown';
        const emp = employees.find(e => e.walletAddress?.toLowerCase() === address.toLowerCase());
        return emp ? emp.name : null;
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.walletAddress.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (!user || user.role !== 'hr') {
            navigate('/');
        }
    }, [user, navigate]);

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="dashboard-sidebar glass-card">
                <div className="sidebar-header">
                    <div className="logo-section">
                        <div className="logo-icon-small">
                            <Wallet size={24} />
                        </div>
                        <span className="logo-text-small">StreamPay</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <TrendingUp size={20} />
                        <span>Overview</span>
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'employees' ? 'active' : ''}`}
                        onClick={() => setActiveTab('employees')}
                    >
                        <Users size={20} />
                        <span>Employees</span>
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'streams' ? 'active' : ''}`}
                        onClick={() => setActiveTab('streams')}
                    >
                        <Activity size={20} />
                        <span>Active Streams</span>
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'contract' ? 'active' : ''}`}
                        onClick={() => setActiveTab('contract')}
                    >
                        <DollarSign size={20} />
                        <span>Contract Balance</span>
                    </button>
                </nav>

                <div className="sidebar-quick-actions">
                    <h4 className="sidebar-section-title">Quick Actions</h4>
                    <div className="quick-actions-list">
                        <Button
                            variant="success"
                            size="sm"
                            fullWidth
                            onClick={() => setShowAddMoneyModal(true)}
                            icon={<DollarSign size={16} />}
                            disabled={!walletAddress}
                        >
                            Add Funds
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            fullWidth
                            onClick={() => setShowCreateStreamModal(true)}
                            icon={<Play size={16} />}
                            disabled={!walletAddress}
                        >
                            New Stream
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onClick={() => setShowCreateEmployeeModal(true)}
                            icon={<Plus size={16} />}
                        >
                            Add Employee
                        </Button>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <Button variant="danger" size="sm" fullWidth onClick={handleLogout} icon={<LogOut size={16} />}>
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main">
                {/* Header */}
                <header className="dashboard-header">
                    <div className="header-left">
                        <h1>HR Dashboard</h1>
                        <p>Welcome back, {user?.name}!</p>
                    </div>
                    <div className="header-right">
                        {walletAddress ? (
                            <div className="wallet-connected">
                                <div className="wallet-dot"></div>
                                <span className="wallet-address">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                                <Button variant="ghost" size="sm" onClick={disconnectWallet}>
                                    Disconnect
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="success"
                                size="md"
                                onClick={handleConnectWallet}
                                loading={connectingWallet}
                                icon={<Wallet size={20} />}
                            >
                                Connect Wallet
                            </Button>
                        )}
                    </div>
                </header>

                {/* Content Area */}
                <div className="dashboard-content">
                    {!walletAddress && (
                        <div className="wallet-alert glass-card">
                            <AlertCircle size={24} />
                            <div>
                                <h4>Wallet Not Connected</h4>
                                <p>Please connect your wallet to manage streams and contracts</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div className="overview-section animate-fade-in">
                            {/* Stats Cards */}
                            <div className="stats-grid">
                                <Card className="stat-card" hover>
                                    <div className="stat-icon-wrapper stat-primary">
                                        <Users size={32} />
                                    </div>
                                    <div className="stat-content">
                                        <h3>{dashboardStats.totalEmployees}</h3>
                                        <p>Total Employees</p>
                                        <span className="stat-change positive">+12% from last month</span>
                                    </div>
                                </Card>

                                <Card className="stat-card" hover>
                                    <div className="stat-icon-wrapper stat-success">
                                        <Activity size={32} />
                                    </div>
                                    <div className="stat-content">
                                        <h3>{dashboardStats.activeStreams}</h3>
                                        <p>Active Streams</p>
                                        <span className="stat-change positive">+8% from last month</span>
                                    </div>
                                </Card>

                                <Card className="stat-card" hover>
                                    <div className="stat-icon-wrapper stat-warning">
                                        <DollarSign size={32} />
                                    </div>
                                    <div className="stat-content">
                                        <h3>${dashboardStats.contractBalance.toLocaleString()}</h3>
                                        <p>Contract Balance</p>
                                        <span className="stat-change neutral">Available funds</span>
                                    </div>
                                </Card>

                                <Card className="stat-card" hover>
                                    <div className="stat-icon-wrapper stat-info">
                                        <TrendingUp size={32} />
                                    </div>
                                    <div className="stat-content">
                                        <h3>${dashboardStats.monthlyPayroll.toLocaleString()}</h3>
                                        <p>Monthly Payroll</p>
                                        <span className="stat-change positive">Current month</span>
                                    </div>
                                </Card>
                            </div>

                            {/* Charts */}
                            <div className="charts-grid">
                                <Card className="chart-card">
                                    <CardHeader>
                                        <h3>Payment Streams Over Time</h3>
                                        <p>Monthly streaming volume</p>
                                    </CardHeader>
                                    <CardBody>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={streamData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                <XAxis dataKey="month" stroke="var(--gray-400)" />
                                                <YAxis stroke="var(--gray-400)" />
                                                <Tooltip
                                                    contentStyle={{
                                                        background: 'var(--dark-surface)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '8px',
                                                    }}
                                                />
                                                <Line type="monotone" dataKey="amount" stroke="#667eea" strokeWidth={3} dot={{ fill: '#667eea', r: 5 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardBody>
                                </Card>

                                <Card className="chart-card">
                                    <CardHeader>
                                        <h3>Employees by Department</h3>
                                        <p>Distribution overview</p>
                                    </CardHeader>
                                    <CardBody>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={departmentData}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={100}
                                                    dataKey="value"
                                                    label={({ name, value }) => `${name}: ${value}`}
                                                >
                                                    {departmentData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        background: 'var(--dark-surface)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '8px',
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardBody>
                                </Card>
                            </div>
                        </div>
                    )}

                    {activeTab === 'employees' && (
                        <div className="employees-section animate-fade-in">
                            <Card>
                                <CardHeader>
                                    <div className="section-header">
                                        <div>
                                            <h3>All Employees</h3>
                                            <p>{filteredEmployees.length} employees found</p>
                                        </div>
                                        <div className="header-actions">
                                            <input
                                                type="file"
                                                id="excel-upload"
                                                accept=".xlsx,.xls,.csv"
                                                onChange={handleImportExcel}
                                                style={{ display: 'none' }}
                                            />
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => document.getElementById('excel-upload')?.click()}
                                                icon={<Upload size={16} />}
                                            >
                                                Import
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={handleExportExcel}
                                                icon={<FileDown size={16} />}
                                            >
                                                Export
                                            </Button>
                                            <Button
                                                variant="primary"
                                                onClick={() => setShowCreateEmployeeModal(true)}
                                                icon={<Plus size={16} />}
                                            >
                                                Add Employee
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    {/* Search and Filter */}
                                    <div className="table-controls">
                                        <Input
                                            placeholder="Search by name, ID, or wallet address..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            icon={<Search size={20} />}
                                        />
                                    </div>

                                    {/* Employees Table */}
                                    <div className="table-container">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Employee ID</th>
                                                    <th>Name</th>
                                                    <th>Department</th>
                                                    <th>Wallet Address</th>
                                                    <th>Salary (monthly)</th>

                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredEmployees.map((emp) => (
                                                    <tr key={emp.id}>
                                                        <td><span className="mono-text">{emp.id}</span></td>
                                                        <td><strong>{emp.name}</strong></td>
                                                        <td>{emp.department}</td>
                                                        <td><span className="mono-text wallet-text">{emp.walletAddress}</span></td>
                                                        <td><strong>${emp.salary.toLocaleString()}</strong></td>

                                                        <td>
                                                            <div className="action-buttons">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setEditingEmployee(emp);
                                                                        setShowEditEmployeeModal(true);
                                                                    }}
                                                                    icon={<Edit2 size={16} />}
                                                                >
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    variant="danger"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteEmployee(emp._id)}
                                                                    icon={<X size={16} />}
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'streams' && (
                        <div className="streams-section animate-fade-in">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3>Active Payment Streams</h3>
                                            <p>Monitor real-time salary streaming from the contract</p>
                                        </div>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={handleEmergencyWithdraw}
                                            icon={<AlertCircle size={16} />}
                                            disabled={!walletAddress}
                                        >
                                            Emergency Halt
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <div className="streams-list">
                                        {streams.length === 0 ? (
                                            <div className="empty-state">
                                                <Activity size={48} />
                                                <p>No active streams found in indexer.</p>
                                            </div>
                                        ) : (
                                            streams.map(stream => (
                                                <div key={stream.streamId} className="stream-item glass-card">
                                                    <div className="stream-info">
                                                        <div className="stream-avatar">
                                                            {(getEmployeeNameByWallet(stream.workerAddress) || stream.workerName || 'W').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="stream-details">
                                                            <h4>{getEmployeeNameByWallet(stream.workerAddress) || stream.workerName || 'Unknown Worker'}</h4>
                                                            <p className="mono-text">{stream.workerAddress.slice(0, 6)}...{stream.workerAddress.slice(-4)}</p>
                                                            <span className="stream-id-tag">ID: #{stream.streamId}</span>
                                                        </div>
                                                    </div>
                                                    <div className="stream-stats">
                                                        <div className="stream-stat">
                                                            <span className="stat-label">Total Deposit</span>
                                                            <span className="stat-value">{(Number(stream.deposit) / 1e18).toFixed(4)} ETH</span>
                                                        </div>
                                                        <div className="stream-stat">
                                                            <span className="stat-label">Withdrawn</span>
                                                            <span className="stat-value">{(Number(stream.withdrawn) / 1e18).toFixed(4)} ETH</span>
                                                        </div>
                                                        <div className="stream-stat">
                                                            <span className="stat-label">Status</span>
                                                            <span className={`status-badge status-${stream.state.toLowerCase()}`}>
                                                                {stream.state === 'Active' && <span className="pulse-dot"></span>}
                                                                {stream.state}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="stream-actions">
                                                        {stream.state === 'Active' ? (
                                                            <Button
                                                                variant="warning"
                                                                size="sm"
                                                                onClick={() => handlePauseStream(stream.streamId)}
                                                                icon={<Pause size={16} />}
                                                                disabled={!walletAddress}
                                                            >
                                                                Pause
                                                            </Button>
                                                        ) : stream.state === 'Paused' ? (
                                                            <Button
                                                                variant="success"
                                                                size="sm"
                                                                onClick={() => handleResumeStream(stream.streamId)}
                                                                icon={<Play size={16} />}
                                                                disabled={!walletAddress}
                                                            >
                                                                Resume
                                                            </Button>
                                                        ) : null}
                                                        {(stream.state === 'Active' || stream.state === 'Paused') && (
                                                            <Button
                                                                variant="danger"
                                                                size="sm"
                                                                onClick={() => handleCancelStream(stream.streamId)}
                                                                icon={<X size={16} />}
                                                                disabled={!walletAddress}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'contract' && (
                        <div className="contract-section animate-fade-in">
                            <div className="contract-grid">
                                <Card className="contract-balance-card">
                                    <CardHeader>
                                        <h3>Contract Balance</h3>
                                        <p>Available for streaming</p>
                                    </CardHeader>
                                    <CardBody>
                                        <div className="balance-display">
                                            <div className="balance-amount gradient-text">
                                                ${dashboardStats.contractBalance.toLocaleString()}
                                            </div>
                                            <div className="balance-eth">
                                                ≈ {(dashboardStats.contractBalance / 2000).toFixed(4)} ETH
                                            </div>
                                        </div>
                                        <Button
                                            variant="success"
                                            size="lg"
                                            fullWidth
                                            onClick={() => setShowAddMoneyModal(true)}
                                            icon={<DollarSign size={20} />}
                                            disabled={!walletAddress}
                                        >
                                            Add Funds
                                        </Button>
                                    </CardBody>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <h3>Monthly Burn Rate</h3>
                                        <p>Projected monthly expenses</p>
                                    </CardHeader>
                                    <CardBody>
                                        <div className="burn-rate-chart">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={streamData.slice(-3)}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                    <XAxis dataKey="month" stroke="var(--gray-400)" />
                                                    <YAxis stroke="var(--gray-400)" />
                                                    <Tooltip
                                                        contentStyle={{
                                                            background: 'var(--dark-surface)',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: '8px',
                                                        }}
                                                    />
                                                    <Bar dataKey="amount" fill="#22c55e" radius={[8, 8, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <h3>Transaction History</h3>
                                    <p>Recent contract transactions</p>
                                </CardHeader>
                                <CardBody>
                                    <div className="transactions-list">
                                        <div className="transaction-item">
                                            <div className="transaction-icon success">
                                                <DollarSign size={20} />
                                            </div>
                                            <div className="transaction-details">
                                                <h4>Funds Added</h4>
                                                <p className="mono-text">0x1a2b...3c4d</p>
                                            </div>
                                            <div className="transaction-amount success">+$50,000</div>
                                        </div>
                                        <div className="transaction-item">
                                            <div className="transaction-icon primary">
                                                <Play size={20} />
                                            </div>
                                            <div className="transaction-details">
                                                <h4>Stream Started</h4>
                                                <p>John Doe - EMP001</p>
                                            </div>
                                            <div className="transaction-amount">$5,000/month</div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            {showAddMoneyModal && (
                <Modal onClose={() => setShowAddMoneyModal(false)} title="Add Money to Contract">
                    <AddMoneyForm onSubmit={handleAddMoney} onCancel={() => setShowAddMoneyModal(false)} />
                </Modal>
            )}

            {showCreateStreamModal && (
                <Modal onClose={() => setShowCreateStreamModal(false)} title="Create New Payment Stream">
                    <CreateStreamForm
                        employees={employees}
                        onSubmit={handleCreateStream}
                        onCancel={() => setShowCreateStreamModal(false)}
                    />
                </Modal>
            )}

            {showCreateEmployeeModal && (
                <Modal onClose={() => setShowCreateEmployeeModal(false)} title="Add New Employee">
                    <CreateEmployeeForm
                        onSubmit={handleCreateEmployee}
                        onCancel={() => setShowCreateEmployeeModal(false)}
                    />
                </Modal>
            )}

            {showEditEmployeeModal && editingEmployee && (
                <Modal onClose={() => { setShowEditEmployeeModal(false); setEditingEmployee(null); }} title="Edit Employee">
                    <EditEmployeeForm
                        employee={editingEmployee}
                        onSubmit={handleUpdateEmployee}
                        onCancel={() => { setShowEditEmployeeModal(false); setEditingEmployee(null); }}
                    />
                </Modal>
            )}
        </div>
    );
};

// Modal Component
const Modal = ({ children, onClose, title }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Add Money Form
const AddMoneyForm = ({ onSubmit, onCancel }) => {
    const [amount, setAmount] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(amount);
    };

    return (
        <form onSubmit={handleSubmit} className="modal-form">
            <Input
                label="Amount (ETH)"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1.5"
                required
                icon={<DollarSign size={20} />}
            />
            <div className="modal-actions">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" variant="success">
                    Add Funds
                </Button>
            </div>
        </form>
    );
};

// Create Stream Form
const CreateStreamForm = ({ onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        walletAddress: '',
        amount: '',
        streamType: 'Continuous',
        durationOrEndTime: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="modal-form">
            <Input
                label="Employee Wallet Address"
                value={formData.walletAddress}
                onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                placeholder="0x..."
                required
                icon={<Wallet size={20} />}
            />
            <Input
                label="Total Amount (ETH)"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="10.5"
                required
                icon={<DollarSign size={20} />}
            />
            <div className="input-field">
                <label className="input-label">Stream Type</label>
                <select
                    className="input"
                    value={formData.streamType}
                    onChange={(e) => setFormData({ ...formData, streamType: e.target.value })}
                >
                    <option value="Continuous">Continuous</option>
                    <option value="OneTime">One Time</option>
                </select>
            </div>
            <Input
                label={formData.streamType === 'Continuous' ? "Duration (Seconds)" : "End Timestamp"}
                type="number"
                value={formData.durationOrEndTime}
                onChange={(e) => setFormData({ ...formData, durationOrEndTime: e.target.value })}
                placeholder={formData.streamType === 'Continuous' ? "2592000 (30 days)" : "1739525400"}
                required
                icon={<Activity size={20} />}
            />
            <div className="modal-actions">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary">
                    Create Stream
                </Button>
            </div>
        </form>
    );
};

// Create Employee Form
const CreateEmployeeForm = ({ onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        department: '',
        walletAddress: '',
        salary: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="modal-form">
            <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
            />
            <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@company.com"
                required
                icon={<Mail size={20} />}
            />
            <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                icon={<Lock size={20} />}
            />
            <Input
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Engineering"
                required
            />
            <Input
                label="Wallet Address"
                value={formData.walletAddress}
                onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                placeholder="0x..."
                required
                icon={<Wallet size={20} />}
            />
            <Input
                label="Monthly Salary (USD)"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                placeholder="5000"
                required
                icon={<DollarSign size={20} />}
            />
            <div className="modal-actions">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" variant="success">
                    Add Employee
                </Button>
            </div>
        </form>
    );
};

const EditEmployeeForm = ({ employee, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: employee.name,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        walletAddress: employee.walletAddress,
        salary: employee.salary,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(employee._id, formData);
    };

    return (
        <form onSubmit={handleSubmit} className="modal-form">
            <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
            />
            <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@company.com"
                required
                icon={<Mail size={20} />}
            />
            <Input
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Engineering"
                required
            />
            <Input
                label="Designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Software Engineer"
                required
            />
            <Input
                label="Wallet Address"
                value={formData.walletAddress}
                onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                placeholder="0x..."
                required
                icon={<Wallet size={20} />}
            />
            <Input
                label="Monthly Salary (USD)"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                placeholder="5000"
                required
                icon={<DollarSign size={20} />}
            />
            <div className="modal-actions">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary">
                    Update Employee
                </Button>
            </div>
        </form>
    );
};

export default HRDashboard;
