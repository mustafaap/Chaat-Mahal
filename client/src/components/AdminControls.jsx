import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConfirmationModal from './ConfirmationModal';
import MenuManagement from './MenuManagement';
import Analytics from './Analytics';
import Toast from './Toast';
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

    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 3000);
    };

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
                    showToast(`Online payments ${newStatus ? 'enabled' : 'disabled'} successfully!`, 'success');
                } else {
                    showToast('Failed to update payment settings. Please try again.', 'error');
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
                    showToast('Order view has been reset successfully. Only new orders will be displayed.', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } catch (error) {
                    console.error('Error resetting order timestamp:', error);
                    showToast('Failed to reset order view. Please try again.', 'error');
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

    const renderContent = () => {
        switch (currentView) {
            case 'menu':
                return (
                    <div className="content-section">
                        <MenuManagement activeTab="items" />
                    </div>
                );
            
            case 'categories':
                return (
                    <div className="content-section">
                        <MenuManagement activeTab="categories" />
                    </div>
                );
            
            case 'analytics':
                return (
                    <div className="content-section">
                        <Analytics />
                    </div>
                );
            
            case 'settings':
                return (
                    <div className="content-section">
                        <h2>⚙️ Settings</h2>
                        <div className="settings-content">
                            <div className="setting-card">
                                <div className="setting-header">
                                    <div className="setting-icon">💳</div>
                                    <div className="setting-info">
                                        <h3>Payment Settings</h3>
                                        <p>Enable or disable online payments (use when payment system is down)</p>
                                    </div>
                                </div>
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

                            <div className="setting-card">
                                <div className="setting-header">
                                    <div className="setting-icon">🔄</div>
                                    <div className="setting-info">
                                        <h3>Reset Order View</h3>
                                        <p>Clear current orders from display (orders remain in database for records)</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={resetAllOrders}
                                    className="admin-control-button reset-btn"
                                >
                                    Reset Order View
                                </button>
                            </div>
                        </div>
                    </div>
                );
            
            case 'dashboard':
            default:
                return (
                    <div className="content-section">
                        <h2>👋 Welcome to Admin Dashboard</h2>
                        <div className="dashboard-welcome">
                            <div className="welcome-icon">🎯</div>
                            <h3>Select an option from the sidebar</h3>
                            <p>Use the navigation menu to manage your restaurant's menu, view analytics, configure settings, or logout.</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="admin-controls-container">
            {/* Vertical Navbar */}
            <div className="admin-sidebar">
                <div className="sidebar-header">
                    <h2>Admin Panel</h2>
                    <p>Chaat Mahal</p>
                </div>
                
                <nav className="sidebar-nav">
                    <button 
                        className={`nav-item ${currentView === 'menu' ? 'active' : ''}`}
                        onClick={() => setCurrentView('menu')}
                    >
                        <span className="nav-icon">🍽️</span>
                        <span className="nav-text">Menu Items</span>
                    </button>
                    
                    <button 
                        className={`nav-item ${currentView === 'categories' ? 'active' : ''}`}
                        onClick={() => setCurrentView('categories')}
                    >
                        <span className="nav-icon">🗂️</span>
                        <span className="nav-text">Categories</span>
                    </button>
                    
                    <button 
                        className={`nav-item ${currentView === 'analytics' ? 'active' : ''}`}
                        onClick={() => setCurrentView('analytics')}
                    >
                        <span className="nav-icon">📊</span>
                        <span className="nav-text">Analytics</span>
                    </button>
                    
                    <button 
                        className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
                        onClick={() => setCurrentView('settings')}
                    >
                        <span className="nav-icon">⚙️</span>
                        <span className="nav-text">Settings</span>
                    </button>
                    
                    <button 
                        className="nav-item logout-item"
                        onClick={handleLogout}
                    >
                        <span className="nav-icon">🚪</span>
                        <span className="nav-text">Logout</span>
                    </button>
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="admin-content">
                {renderContent()}
            </div>

            {/* Toast Notification */}
            <Toast 
                show={toast.show}
                message={toast.message}
                type={toast.type}
            />

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