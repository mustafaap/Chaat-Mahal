import React, { useState } from 'react';
import axios from 'axios';
import '../styles/AdminLogin.css';

const AdminLogin = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/auth/login', { password });
            const { role } = res.data;
            localStorage.setItem('adminAuthenticated', 'true');
            localStorage.setItem('adminRole', role);
            onLogin(role);
        } catch (err) {
            setError('Incorrect password');
            setPassword('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-container">
            <div className="admin-login-card">
                <img src="/images/Chaat-Mahal.jpg" alt="Chaat Mahal" className="admin-login-logo" />
                <h2>Admin Access</h2>
                <p>Enter your password to continue</p>
                
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Admin Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="admin-password-input"
                        autoFocus
                    />
                    
                    {error && <div className="admin-error">{error}</div>}
                    
                    <button type="submit" className="admin-login-btn" disabled={loading}>
                        {loading ? 'Verifying...' : 'Access Admin Panel'}
                    </button>
                </form>
                
                <button 
                    className="back-to-menu-btn"
                    onClick={() => window.location.href = '/'}
                >
                    Back to Menu
                </button>
            </div>
        </div>
    );
};

export default AdminLogin;