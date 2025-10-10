import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConfirmationModal from './ConfirmationModal';
import MenuManagement from './MenuManagement';
import '../styles/AdminControls.css';

const AdminControls = () => {
    const [currentView, setCurrentView] = useState(() => {
        const savedView = localStorage.getItem('adminControlsView');
        return savedView || 'dashboard';
    });

    const [settings, setSettings] = useState({
        onlinePaymentEnabled: true
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        type: 'default',
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: null
    });

    // Fetch settings on component mount
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axios.get('/api/settings');
            setSettings(response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const updateSettings = async (newSettings) => {
        try {
            const response = await axios.patch('/api/settings', newSettings);
            setSettings(response.data.settings);
            return true;
        } catch (error) {
            console.error('Error updating settings:', error);
            return false;
        }
    };

    const toggleOnlinePayment = () => {
        const newStatus = !settings.onlinePaymentEnabled;
        
        openModal({
            type: newStatus ? 'default' : 'danger', 
            title: newStatus ? 'Enable Online Payments' : 'Disable Online Payments',
            message: newStatus 
                ? 'Are you sure you want to enable online payments? Customers will be able to pay with cards and digital wallets.'
                : 'Are you sure you want to disable online payments? Customers will only be able to pay at the counter. This should only be used when payment systems are down.',
            confirmText: newStatus ? 'Enable Online Payments' : 'Disable Online Payments',
            cancelText: 'Cancel',
            onConfirm: async () => {
                const success = await updateSettings({ onlinePaymentEnabled: newStatus });
                if (success) {
                    alert(`Online payments ${newStatus ? 'enabled' : 'disabled'} successfully!`);
                } else {
                    alert('Failed to update payment settings. Please try again.');
                }
            }
        });
    };

    // Save to localStorage whenever currentView changes
    useEffect(() => {
        localStorage.setItem('adminControlsView', currentView);
    }, [currentView]);

    // Add this useEffect to scroll to top when view changes
    useEffect(() => {
        // Scroll to top when view changes
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentView]);

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

    // Add logout function
    const handleLogout = () => {
        openModal({
            type: 'danger',
            title: 'Logout Confirmation',
            message: 'Are you sure you want to logout? You will need to enter the admin password again to access this panel.',
            confirmText: 'Logout',
            cancelText: 'Cancel',
            onConfirm: () => {
                localStorage.removeItem('adminAuthenticated');
                window.location.href = '/orders'; // This will redirect to login since auth is removed
            }
        });
    };

    if (currentView === 'menu') {
        return (
            <div className="admin-controls-wrapper">
                <div className="admin-controls-nav">
                    <button 
                        className="nav-back-btn"
                        onClick={() => setCurrentView('dashboard')}
                    >
                        ← Back to Dashboard
                    </button>
                </div>
                <MenuManagement />
            </div>
        );
    }

    return (
        <div className="admin-controls-container">
            <h1>Admin Controls</h1>
            <p className="controls-subtitle">Manage system settings and data</p>
            
            <div className="controls-grid">
                <div className="control-card">
                    <div className="control-icon">🍽️</div>
                    <h3>Menu Management</h3>
                    <p>Add, edit, or remove menu items, options and prices</p>
                    <button 
                        className="admin-control-button menu-btn"
                        onClick={() => setCurrentView('menu')}
                    >
                        Manage Menu
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

                <div className="control-card">
                    <div className="control-icon">💳</div>
                    <h3>Payment Settings</h3>
                    <p>Enable or disable online payments (use when payment system is down)</p>
                    <div className="payment-status">
                        <span className={`status-indicator ${settings.onlinePaymentEnabled ? 'enabled' : 'disabled'}`}>
                            {settings.onlinePaymentEnabled ? '🟢 Online Payments Enabled' : '🔴 Online Payments Disabled'}
                        </span>
                    </div>
                    <button 
                        className={`admin-control-button ${settings.onlinePaymentEnabled ? 'disable-btn' : 'enable-btn'}`}
                        onClick={toggleOnlinePayment}
                    >
                        {settings.onlinePaymentEnabled ? 'Disable Online Payments' : 'Enable Online Payments'}
                    </button>
                </div>

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

                <div className="control-card logout-card">
                    <div className="control-icon">🚪</div>
                    <h3>Logout</h3>
                    <p>Sign out of the admin panel</p>
                    <button 
                        className="admin-control-button logout-btn"
                        onClick={handleLogout}
                    >
                        Logout
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