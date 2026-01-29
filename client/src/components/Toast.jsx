import React from 'react';
import '../styles/Toast.css';

const Toast = ({ show, message, type, onClose }) => {
    if (!show) return null;

    return (
        <div className={`toast-notification toast-${type}`}>
            <div className="toast-icon">
                {type === 'success' && '✓'}
                {type === 'error' && '✕'}
                {type === 'warning' && '⚠'}
                {type === 'info' && 'ℹ'}
            </div>
            <div className="toast-message">{message}</div>
        </div>
    );
};

export default Toast;
