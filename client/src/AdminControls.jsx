import React, { useState } from 'react';
import axios from 'axios';
import ConfirmationModal from './components/ConfirmationModal';
import './styles/AdminControls.css';

const AdminControls = () => {
    const [modalState, setModalState] = useState({
        isOpen: false,
        type: 'default',
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: null
    });

    const openModal = (config) => {
        setModalState({
            isOpen: true,
            ...config
        });
    };

    const closeModal = () => {
        setModalState({
            isOpen: false,
            type: 'default',
            title: '',
            message: '',
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            onConfirm: null
        });
    };

    const resetAllOrders = () => {
        openModal({
            type: 'danger',
            title: 'Reset Order View',
            message: 'Are you sure you want to reset the order view? This will hide all current orders from the display but keep them in the database for records. Only new orders will be visible after this action.',
            confirmText: 'Reset Order View',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.post('/api/orders/reset-timestamp');
                    alert('Order view has been reset successfully. Only new orders will be displayed.');
                    window.location.reload();
                } catch (error) {
                    console.error('Error resetting order view:', error);
                    alert('Failed to reset order view. Please try again.');
                }
            }
        });
    };

    return (
        <div className="admin-controls-container">
            <h1>Admin Controls</h1>
            <p className="controls-subtitle">Manage system settings and data</p>
            
            <div className="controls-grid">
                <div className="control-card">
                    <div className="control-icon">🔄</div>
                    <h3>Reset Order View</h3>
                    <p>Clear Orders (orders remain in database for records)</p>
                    <button 
                        onClick={resetAllOrders}
                        className="admin-control-button reset-btn"
                    >
                        Reset Order View
                    </button>
                </div>
                
                {/* Placeholder for future controls */}
                <div className="control-card coming-soon">
                    <div className="control-icon">⚙️</div>
                    <h3>System Settings</h3>
                    <p>Configure restaurant settings and preferences</p>
                    <button className="admin-control-button disabled-btn" disabled>
                        Coming Soon
                    </button>
                </div>
                
                <div className="control-card coming-soon">
                    <div className="control-icon">📊</div>
                    <h3>Analytics</h3>
                    <p>View sales reports and order statistics</p>
                    <button className="admin-control-button disabled-btn" disabled>
                        Coming Soon
                    </button>
                </div>
                
                <div className="control-card coming-soon">
                    <div className="control-icon">🍽️</div>
                    <h3>Menu Management</h3>
                    <p>Add, edit, or remove menu items and prices</p>
                    <button className="admin-control-button disabled-btn" disabled>
                        Coming Soon
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
                message={modalState.message}
                confirmText={modalState.confirmText}
                cancelText={modalState.cancelText}
                type={modalState.type}
            />
        </div>
    );
};

export default AdminControls;