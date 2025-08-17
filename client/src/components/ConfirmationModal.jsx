import React from 'react';
import './ConfirmationModal.css';

const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = "Confirm", 
    cancelText = "Cancel",
    type = "default" // default, danger, warning
}) => {
    if (!isOpen) return null;

    const getModalClass = () => {
        switch (type) {
            case 'danger': return 'modal-danger';
            case 'warning': return 'modal-warning';
            default: return 'modal-default';
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-content ${getModalClass()}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close-btn" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-body">
                    <p className="modal-message">{message}</p>
                </div>
                
                <div className="modal-footer">
                    <button 
                        className="modal-btn modal-cancel-btn" 
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                    <button 
                        className={`modal-btn modal-confirm-btn ${type === 'danger' ? 'btn-danger' : type === 'warning' ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;