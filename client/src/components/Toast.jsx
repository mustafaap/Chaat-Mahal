import React from 'react';
import { FiCheck, FiX, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import '../styles/Toast.css';

const Toast = ({ show, message, type, onClose }) => {
    if (!show) return null;

    return (
        <div className={`toast-notification toast-${type}`}>
            <div className="toast-icon">
                {type === 'success' && <FiCheck />}
                {type === 'error' && <FiX />}
                {type === 'warning' && <FiAlertTriangle />}
                {type === 'info' && <FiInfo />}
            </div>
            <div className="toast-message">{message}</div>
        </div>
    );
};

export default Toast;
