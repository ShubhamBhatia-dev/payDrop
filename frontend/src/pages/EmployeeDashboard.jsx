import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { streamAPI } from '../api/api';
import { withdraw } from '../utils/web3Service';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card, { CardHeader, CardBody } from '../components/Card';
import {
    Wallet, LogOut, DollarSign, TrendingUp, Download, Clock,
    Activity, Eye, EyeOff, Copy, Check, ArrowDownToLine, Receipt,
    ArrowLeftRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './EmployeeDashboard.css';

// Precision scaling (1e18)
const PRECISION = BigInt(1e18);

// Formatting helper
const formatWei = (weiBigInt) => {
    if (!weiBigInt) return "0.000000";
    return (Number(weiBigInt) / 1e18).toFixed(6);
};

const EmployeeDashboard = () => {
    const { user, logout, walletAddress, connectWallet } = useAuth();
    const navigate = useNavigate();
    const [showBalance, setShowBalance] = useState(true);
    const [copied, setCopied] = useState(false);
    const [connectingWallet, setConnectingWallet] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Data States
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [liveClaimable, setLiveClaimable] = useState({}); // streamId -> amount (BigInt)

    useEffect(() => {
        const fetchUserStreams = async () => {
            if (!walletAddress) return;
            try {
                const data = await streamAPI.getUserStreams(walletAddress);
                setStreams(data);
            } catch (error) {
                console.error("Failed to fetch user streams", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserStreams();
    }, [walletAddress]);

    // Live counter logic
    useEffect(() => {
        if (streams.length === 0) return;

        const timer = setInterval(() => {
            const newClaimable = {};
            streams.forEach(stream => {
                if (stream.state !== 'Active' && stream.state !== 'Paused') {
                    newClaimable[stream.streamId] = 0n;
                    return;
                }

                const now = BigInt(Math.floor(Date.now() / 1000));
                const startTime = BigInt(stream.startTime);
                const endTime = BigInt(stream.endTime);
                const ratePerSecond = BigInt(stream.ratePerSecond);
                const deposit = BigInt(stream.deposit);
                const withdrawn = BigInt(stream.withdrawn);
                const totalPaused = BigInt(stream.totalPausedDuration || 0);

                let effectiveTime = now;
                if (stream.state === 'Paused') {
                    // If backend updated state to Paused, we should have pausedTime or assume current behavior
                    // For simplified meta-mask first, we assume endTime was shifted or we calculate up to now
                    // The contract calculates precisely. Here we approximate for UI.
                    effectiveTime = now; // simplified
                }

                if (effectiveTime < startTime) {
                    newClaimable[stream.streamId] = 0n;
                    return;
                }

                const elapsed = effectiveTime - startTime - totalPaused;
                const adjustedEnd = endTime + totalPaused;
                const actualEffective = effectiveTime > adjustedEnd ? adjustedEnd : effectiveTime;
                const actualElapsed = actualEffective - startTime - totalPaused;

                const vestedScaled = actualElapsed * ratePerSecond;
                const totalVested = vestedScaled / PRECISION;

                const cappedVested = totalVested > deposit ? deposit : totalVested;
                const claimable = cappedVested > withdrawn ? cappedVested - withdrawn : 0n;

                newClaimable[stream.streamId] = claimable;
            });
            setLiveClaimable(newClaimable);
        }, 1000);

        return () => clearInterval(timer);
    }, [streams]);

    useEffect(() => {
        if (!user || user.role !== 'employee') {
            navigate('/');
        }
    }, [user, navigate]);

    // Mock data for visualizations - restore these
    const earningsHistory = [
        { date: 'Week 1', amount: 0.05 },
        { date: 'Week 2', amount: 0.12 },
        { date: 'Week 3', amount: 0.08 },
        { date: 'Week 4', amount: 0.15 },
        { date: 'Week 5', amount: 0.10 },
        { date: 'Week 6', amount: 0.18 },
        { date: 'Week 7', amount: 0.25 },
    ];

    const recentTransactions = streams.flatMap(s => [
        { id: `tx-${s.streamId}-1`, type: 'Stream Created', amount: formatWei(BigInt(s.deposit)), date: new Date(s.startTime * 1000).toISOString(), status: 'completed' },
        ...(Number(s.withdrawn) > 0 ? [{ id: `tx-${s.streamId}-2`, type: 'Withdrawal', amount: formatWei(BigInt(s.withdrawn)), date: new Date().toISOString(), status: 'completed' }] : [])
    ]);

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

    const handleCopyAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleWithdraw = async (streamId) => {
        if (!walletAddress) {
            alert('Please connect your wallet first');
            return;
        }
        try {
            await withdraw(streamId);
            alert('Withdrawal successful! Your balance will be updated shortly.');
        } catch (error) {
            console.error('Withdrawal failed:', error);
            alert('Withdrawal failed: ' + error.message);
        }
    };

    const [exchangeAmount, setExchangeAmount] = useState('');
    const EXCHANGE_RATE = 0.0005; // 1 USD = 0.0005 ETH (example rate)

    const handleExchange = () => {
        if (!walletAddress) {
            alert('Please connect your wallet first');
            return;
        }
        if (!exchangeAmount || parseFloat(exchangeAmount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        const amount = parseFloat(exchangeAmount);
        const totalClaimable = Object.values(liveClaimable).reduce((acc, v) => acc + v, 0n);
        if (BigInt(Math.floor(amount * 1e18)) > totalClaimable) {
            alert('Insufficient balance to exchange');
            return;
        }
        const ethAmount = (amount * EXCHANGE_RATE).toFixed(6);
        console.log('Exchanging:', { amount, ethAmount });
        alert(`Exchange initiated!\n$${amount} → ${ethAmount} ETH`);
        setExchangeAmount('');
    };

    return (
        <div className="employee-dashboard-container">
            {/* Header */}
            <header className="employee-header">
                <div className="header-content">
                    <div className="header-left">
                        <div className="logo-section">
                            <div className="logo-icon-small">
                                <Wallet size={20} />
                            </div>
                            <span className="logo-text-small">StreamPay</span>
                        </div>
                    </div>

                    <div className="header-right">
                        {walletAddress ? (
                            <div className="wallet-badge">
                                <div className="wallet-info">
                                    <span className="wallet-label">Wallet</span>
                                    <span className="wallet-address-display">
                                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                    </span>
                                </div>
                                <button className="copy-btn" onClick={handleCopyAddress}>
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                        ) : (
                            <Button
                                variant="success"
                                onClick={handleConnectWallet}
                                loading={connectingWallet}
                                icon={<Wallet size={16} />}
                                size="sm"
                            >
                                Connect Wallet
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleLogout} icon={<LogOut size={16} />}>
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <div className="employee-layout">
                {/* Sidebar */}
                <aside className="employee-sidebar">
                    <div className="sidebar-section">
                        <h4 className="sidebar-title">Navigation</h4>
                        <nav className="sidebar-nav">
                            <button
                                className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
                                onClick={() => setActiveTab('overview')}
                            >
                                <TrendingUp size={18} />
                                <span>Overview</span>
                            </button>
                            <button
                                className={`nav-item ${activeTab === 'streams' ? 'active' : ''}`}
                                onClick={() => setActiveTab('streams')}
                            >
                                <Activity size={18} />
                                <span>Active Streams</span>
                            </button>
                            <button
                                className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
                                onClick={() => setActiveTab('transactions')}
                            >
                                <Receipt size={18} />
                                <span>Transactions</span>
                            </button>
                            <button
                                className={`nav-item ${activeTab === 'exchange' ? 'active' : ''}`}
                                onClick={() => setActiveTab('exchange')}
                            >
                                <ArrowLeftRight size={18} />
                                <span>Exchange</span>
                            </button>
                        </nav>
                    </div>

                    <div className="sidebar-section">
                        <h4 className="sidebar-title">Quick Actions</h4>
                        <div className="sidebar-actions">
                            <Button
                                variant="success"
                                size="sm"
                                fullWidth
                                onClick={() => streams.length > 0 && handleWithdraw(streams[0].streamId)}
                                disabled={!walletAddress || streams.length === 0}
                                icon={<Download size={16} />}
                            >
                                Withdraw Primary
                            </Button>
                        </div>
                    </div>

                    <div className="sidebar-section">
                        <h4 className="sidebar-title">Account Info</h4>
                        <div className="account-info">
                            <div className="info-row">
                                <span className="info-label">Employee ID</span>
                                <span className="info-value mono-text">{user?.employeeId || 'N/A'}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Wallet</span>
                                <span className="info-value mono-text text-xs">
                                    {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Disconnected'}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Current Rate</span>
                                <span className="info-value">
                                    {formatWei(streams.filter(s => s.state === 'Active').reduce((acc, s) => acc + BigInt(s.ratePerSecond), 0n) * 3600n)} ETH/hr
                                </span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="employee-main">
                    {activeTab === 'overview' && (
                        <div className="overview-section animate-fade-in">
                            <div className="welcome-section">
                                <h1>Welcome back, {user?.name}!</h1>
                                <p>Track your real-time earnings and manage your payments</p>
                            </div>

                            {/* Balance Cards */}
                            <div className="balance-cards-grid">
                                <Card className="balance-card" hover>
                                    <div className="balance-card-header">
                                        <div className="balance-icon success">
                                            <DollarSign size={24} />
                                        </div>
                                        <button
                                            className="visibility-toggle"
                                            onClick={() => setShowBalance(!showBalance)}
                                        >
                                            {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </button>
                                    </div>
                                    <div className="balance-info">
                                        <p className="balance-label">Total Withdrawn</p>
                                        <h2 className="balance-amount">
                                            {showBalance ? `${formatWei(streams.reduce((acc, s) => acc + BigInt(s.withdrawn), 0n))} ETH` : '••••••'}
                                        </h2>
                                        <span className="balance-subtext">Lifetime earnings from all streams</span>
                                    </div>
                                </Card>

                                <Card className="balance-card" hover>
                                    <div className="balance-card-header">
                                        <div className="balance-icon primary">
                                            <ArrowDownToLine size={24} />
                                        </div>
                                    </div>
                                    <div className="balance-info">
                                        <p className="balance-label">Available to Withdraw</p>
                                        <h2 className="balance-amount">
                                            {showBalance ? `${formatWei(Object.values(liveClaimable).reduce((acc, v) => acc + v, 0n))} ETH` : '••••••'}
                                        </h2>
                                        <span className="balance-subtext">Vested funds ready for withdrawal</span>
                                    </div>
                                </Card>

                                <Card className="balance-card" hover>
                                    <div className="balance-card-header">
                                        <div className="balance-icon warning">
                                            <Clock size={24} />
                                        </div>
                                    </div>
                                    <div className="balance-info">
                                        <p className="balance-label">Streaming Rate</p>
                                        <h2 className="balance-amount">
                                            {formatWei(streams.filter(s => s.state === 'Active').reduce((acc, s) => acc + BigInt(s.ratePerSecond), 0n) * 3600n)} ETH/hr
                                        </h2>
                                        <span className="balance-subtext">
                                            Estimated monthly: {formatWei(streams.filter(s => s.state === 'Active').reduce((acc, s) => acc + BigInt(s.ratePerSecond), 0n) * 3600n * 24n * 30n)} ETH
                                        </span>
                                    </div>
                                </Card>
                            </div>

                            {/* Earnings Chart */}
                            <Card className="earnings-chart-card">
                                <CardHeader>
                                    <h3>Earnings History</h3>
                                    <p>Last 7 weeks overview</p>
                                </CardHeader>
                                <CardBody>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <LineChart data={earningsHistory}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                                            <XAxis dataKey="date" stroke="var(--gray-400)" style={{ fontSize: '12px' }} />
                                            <YAxis stroke="var(--gray-400)" style={{ fontSize: '12px' }} />
                                            <Tooltip
                                                contentStyle={{
                                                    background: 'var(--white)',
                                                    border: '1px solid var(--gray-200)',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="amount"
                                                stroke="var(--success)"
                                                strokeWidth={2}
                                                dot={{ fill: 'var(--success)', r: 4 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardBody>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'streams' && (
                        <div className="streams-section animate-fade-in">
                            <h2 className="section-title">Active Payment Streams</h2>
                            <p className="section-subtitle">Monitor and manage your incoming streams</p>

                            <div className="streams-list">
                                {streams.length === 0 ? (
                                    <div className="empty-state">
                                        <Activity size={48} />
                                        <p>No active streams found for your wallet.</p>
                                    </div>
                                ) : (
                                    streams.map(stream => (
                                        <Card key={stream.streamId} className="stream-card">
                                            <div className="stream-header">
                                                <div className="stream-info">
                                                    <h4>Payroll Stream #{stream.streamId}</h4>
                                                    <span className={`status-badge status-${stream.state.toLowerCase()}`}>
                                                        {stream.state === 'Active' && <span className="pulse-dot"></span>}
                                                        {stream.state}
                                                    </span>
                                                </div>
                                                <div className="stream-amount">
                                                    <span className="amount-label">Total Deposit</span>
                                                    <span className="amount-value">{formatWei(BigInt(stream.deposit))} ETH</span>
                                                </div>
                                            </div>
                                            <div className="stream-details">
                                                <div className="detail-item">
                                                    <span className="detail-label">Started</span>
                                                    <span className="detail-value">{new Date(stream.startTime * 1000).toLocaleDateString()}</span>
                                                </div>
                                                <div className="detail-item highlighted">
                                                    <span className="detail-label">Claimable Now</span>
                                                    <span className="detail-value mono-text live-counter">
                                                        {formatWei(liveClaimable[stream.streamId] || 0n)} ETH
                                                    </span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Withdrawn</span>
                                                    <span className="detail-value">{formatWei(BigInt(stream.withdrawn))} ETH</span>
                                                </div>
                                            </div>
                                            <div className="stream-actions">
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleWithdraw(stream.streamId)}
                                                    disabled={!walletAddress || (liveClaimable[stream.streamId] || 0n) === 0n}
                                                    icon={<Download size={14} />}
                                                >
                                                    Withdraw Claimable
                                                </Button>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'transactions' && (
                        <div className="transactions-section animate-fade-in">
                            <h2 className="section-title">Transaction History</h2>
                            <p className="section-subtitle">All your payment transactions</p>

                            <Card>
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Type</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentTransactions.map(tx => (
                                                <tr key={tx.id}>
                                                    <td>{new Date(tx.date).toLocaleDateString()}</td>
                                                    <td>{tx.type}</td>
                                                    <td className="amount-cell">${tx.amount.toLocaleString()}</td>
                                                    <td>
                                                        <span className="status-badge status-completed">{tx.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}
                    {activeTab === 'exchange' && (
                        <div className="exchange-section animate-fade-in">
                            <h2 className="section-title">Token Exchange</h2>
                            <p className="section-subtitle">Convert your earnings to crypto tokens</p>

                            <div className="exchange-container">
                                <Card className="exchange-card">
                                    <div className="exchange-header">
                                        <h3>Exchange USD to ETH</h3>
                                        <p className="exchange-rate-badge">Current Rate: 1 USD = {EXCHANGE_RATE} ETH</p>
                                    </div>

                                    <div className="exchange-form">
                                        <div className="input-group">
                                            <label className="input-label">Amount (USD)</label>
                                            <div className="input-wrapper-currency">
                                                <span className="currency-symbol">$</span>
                                                <input
                                                    type="number"
                                                    value={exchangeAmount}
                                                    onChange={(e) => setExchangeAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="exchange-input"
                                                />
                                            </div>
                                            <div className="balance-hint">
                                                Available: {formatWei(Object.values(liveClaimable).reduce((acc, v) => acc + v, 0n))} ETH
                                            </div>
                                        </div>

                                        <div className="exchange-divider">
                                            <div className="divider-line"></div>
                                            <div className="divider-icon">
                                                <ArrowDownToLine size={20} />
                                            </div>
                                            <div className="divider-line"></div>
                                        </div>

                                        <div className="input-group">
                                            <label className="input-label">You Receive (Estimated)</label>
                                            <div className="input-wrapper-currency">
                                                <span className="currency-symbol">ETH</span>
                                                <input
                                                    type="text"
                                                    value={exchangeAmount ? (parseFloat(exchangeAmount) * EXCHANGE_RATE).toFixed(6) : '0.000000'}
                                                    readOnly
                                                    className="exchange-input read-only"
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            variant="primary"
                                            size="lg"
                                            fullWidth
                                            onClick={handleExchange}
                                            disabled={!walletAddress || !exchangeAmount}
                                            icon={<ArrowLeftRight size={20} />}
                                            className="exchange-btn"
                                        >
                                            Exchange Tokens
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
