import React, { useState } from 'react';

const HARDCODED_PASSWORD = 'chaatmahal2024';

const Login = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password === HARDCODED_PASSWORD) {
            onLogin();
        } else {
            setError('Incorrect password. Please try again.');
        }
    };

    return (
        <div style={{
            maxWidth: 400,
            margin: '80px auto',
            padding: 32,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center'
        }}>
            <h2 style={{ color: '#b85c38', marginBottom: "-30px" }}>Login</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                        width: '100%',
                        padding: 10,
                        marginBottom: 18,
                        border: '1px solid #ccc',
                        borderRadius: 6,
                        fontSize: '1rem'
                    }}
                    required
                />
                <button style={{ fontSize: '22px' }} type="submit">Login</button>
            </form>
            {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
        </div>
    );
};

export default Login;