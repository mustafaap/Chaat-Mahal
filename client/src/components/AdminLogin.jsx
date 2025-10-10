import React, { useState } from 'react';
import '../styles/AdminLogin.css';

const AdminLogin = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Check password (you can change this password)
        if (password === 'chaat123') {
            localStorage.setItem('adminAuthenticated', 'true');
            onLogin();
        } else {
            setError('Incorrect password');
            setPassword('');
        }
    };

    return (
        <div className="admin-login-container">
            <div className="admin-login-card">
                <h2>Admin Access</h2>
                <p>Enter admin password to continue</p>
                
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