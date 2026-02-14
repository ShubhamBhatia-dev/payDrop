import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Card, { CardBody } from '../components/Card';
import { Wallet, Mail, Lock, TrendingUp, Zap, Shield, Users } from 'lucide-react';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();
    const { login, register, user } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState('employee');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            if (user.role === 'hr') {
                navigate('/hr-dashboard');
            } else if (user.role === 'employee') {
                navigate('/employee-dashboard');
            }
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { name, email, password } = formData;
        let result;

        try {
            if (isLogin) {
                result = await login(email, password, role);
            } else {
                result = await register({ name, email, password, role });
            }

            if (result.success) {
                if (role === 'hr') {
                    navigate('/hr-dashboard');
                } else {
                    navigate('/employee-dashboard');
                }
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="home-container">
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-background">
                    <div className="gradient-orb orb-1"></div>
                    <div className="gradient-orb orb-2"></div>
                    <div className="gradient-orb orb-3"></div>
                </div>

                <div className="hero-content">
                    <div className="hero-left animate-fade-in">
                        <div className="logo-section">
                            <div className="logo-icon">
                                <Wallet size={40} />
                            </div>
                            <h1 className="logo-text">
                                Stream<span className="gradient-text">Pay</span>
                            </h1>
                        </div>

                        <h2 className="hero-title">
                            Revolutionize Payroll with<br />
                            <span className="gradient-text">Blockchain Money Streaming</span>
                        </h2>

                        <p className="hero-description">
                            Experience real-time salary payments powered by blockchain technology.
                            No more waiting for payday - get paid as you earn, every second of every day.
                        </p>

                        <div className="features-grid">
                            <div className="feature-item">
                                <div className="feature-icon">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h4>Real-Time Payments</h4>
                                    <p>Stream salaries second by second</p>
                                </div>
                            </div>

                            <div className="feature-item">
                                <div className="feature-icon">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h4>Blockchain Security</h4>
                                    <p>Transparent and immutable records</p>
                                </div>
                            </div>

                            <div className="feature-item">
                                <div className="feature-icon">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h4>Financial Freedom</h4>
                                    <p>Access your earnings anytime</p>
                                </div>
                            </div>

                            <div className="feature-item">
                                <div className="feature-icon">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h4>Easy Management</h4>
                                    <p>Streamlined HR operations</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hero-right animate-fade-in">
                        <Card className="login-card">
                            <CardBody>
                                <div className="login-header">
                                    <h3>{isLogin ? 'Welcome Back' : 'Get Started'}</h3>
                                    <p>Sign in to access your dashboard</p>
                                </div>

                                <div className="role-selector">
                                    <button
                                        className={`role-btn ${role === 'employee' ? 'active' : ''} `}
                                        onClick={() => setRole('employee')}
                                    >
                                        <Users size={20} />
                                        Employee
                                    </button>
                                    <button
                                        className={`role-btn ${role === 'hr' ? 'active' : ''} `}
                                        onClick={() => setRole('hr')}
                                    >
                                        <Shield size={20} />
                                        HR Manager
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="login-form">
                                    {!isLogin && (
                                        <Input
                                            label="Full Name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="John Doe"
                                            icon={<Users size={20} />}
                                            required
                                        />
                                    )}

                                    <Input
                                        label="Email"
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="your@email.com"
                                        icon={<Mail size={20} />}
                                        required
                                    />

                                    <Input
                                        label="Password"
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        icon={<Lock size={20} />}
                                        required
                                    />

                                    {error && <div className="error-message">{error}</div>}

                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="lg"
                                        fullWidth
                                        loading={loading}
                                    >
                                        {isLogin ? 'Sign In' : 'Create Account'}
                                    </Button>
                                </form>

                                <div className="login-footer">
                                    <p>
                                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                                        <button
                                            className="link-btn"
                                            onClick={() => setIsLogin(!isLogin)}
                                        >
                                            {isLogin ? 'Sign Up' : 'Sign In'}
                                        </button>
                                    </p>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="stats-section">
                <div className="stats-grid">
                    <div className="stat-item glass-card">
                        <div className="stat-value gradient-text">$10M+</div>
                        <div className="stat-label">Total Streamed</div>
                    </div>
                    <div className="stat-item glass-card">
                        <div className="stat-value gradient-text">5,000+</div>
                        <div className="stat-label">Active Employees</div>
                    </div>
                    <div className="stat-item glass-card">
                        <div className="stat-value gradient-text">99.9%</div>
                        <div className="stat-label">Uptime</div>
                    </div>
                    <div className="stat-item glass-card">
                        <div className="stat-value gradient-text">24/7</div>
                        <div className="stat-label">Support</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
