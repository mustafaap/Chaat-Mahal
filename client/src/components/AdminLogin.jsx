import React, { useState } from 'react';
import '../styles/AdminLogin.css';

const AdminLogin = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (password === 'chaatowner') {
            localStorage.setItem('adminAuthenticated', 'true');
            localStorage.setItem('adminRole', 'owner');
            onLogin('owner');
        } else if (password === 'chaat123') {
            localStorage.setItem('adminAuthenticated', 'true');
            localStorage.setItem('adminRole', 'employee');
            onLogin('employee');
        } else {
            setError('Incorrect password');
            setPassword('');
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
                    
                    <button type="submit" className="admin-login-btn">
                        Access Admin Panel
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