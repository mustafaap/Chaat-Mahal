import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiSettings, FiCreditCard, FiDollarSign, FiRefreshCw, FiList, FiTag, FiBarChart2, FiHome, FiCheckCircle, FiXCircle, FiLock } from 'react-icons/fi';
import ConfirmationModal from './ConfirmationModal';
import MenuManagement from './MenuManagement';
import Analytics from './Analytics';
import Toast from './Toast';
import '../styles/AdminControls.css';

const AdminControls = ({ adminRole }) => {
    const [currentView, setCurrentView] = useState(() => {
        const savedView = localStorage.getItem('adminControlsView');
        return savedView || 'dashboard';
    });

    const [settings, setSettings] = useState({
        onlinePaymentEnabled: true,
        payAtCounterEnabled: true
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

    const togglePayAtCounter = () => {
        const newStatus = !settings.payAtCounterEnabled;
        
        openModal({
            type: newStatus ? 'default' : 'danger', 
            title: newStatus ? 'Enable Pay at Counter' : 'Disable Pay at Counter',
            message: newStatus 
                ? 'Are you sure you want to enable pay at counter? Customers will be able to skip online payment and pay at the counter.'
                : 'Are you sure you want to disable pay at counter? Customers will only be able to pay online. This is useful for events where you want to ensure all payments are processed online beforehand.',
            confirmText: newStatus ? 'Enable Pay at Counter' : 'Disable Pay at Counter',
            cancelText: 'Cancel',
            onConfirm: async () => {
                const success = await updateSettings({ payAtCounterEnabled: newStatus });
                if (success) {
                    showToast(`Pay at counter ${newStatus ? 'enabled' : 'disabled'} successfully!`, 'success');
                } else {
                    showToast('Failed to update pay at counter settings. Please try again.', 'error');
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
                if (adminRole !== 'owner') {
                    return (
                        <div className="content-section">
                            <h2><FiLock /> Access Restricted</h2>
                            <div className="dashboard-welcome">
                                <div className="welcome-icon"><FiLock /></div>
                                <h3>Analytics is only available to owners</h3>
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="content-section">
                        <Analytics />
                    </div>
                );
            
            case 'settings':
                return (
                    <div className="content-section">
                        <h2><FiSettings /> Settings</h2>
                        <div className="settings-content">
                            <div className="setting-card">
                                <div className="setting-header">
                                    <div className="setting-icon"><FiCreditCard /></div>
                                    <div className="setting-info">
                                        <h3>Payment Settings</h3>
                                        <p>Enable or disable online payments (use when payment system is down)</p>
                                    </div>
                                </div>
                                <div className="payment-status">
                                    <span className={`status-indicator ${settings.onlinePaymentEnabled ? 'enabled' : 'disabled'}`}>
                                        {settings.onlinePaymentEnabled ? <><FiCheckCircle style={{color:'#27ae60'}} /> Online Payments Enabled</> : <><FiXCircle style={{color:'#e74c3c'}} /> Online Payments Disabled</>}
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
                                    <div className="setting-icon"><FiDollarSign /></div>
                                    <div className="setting-info">
                                        <h3>Pay at Counter Settings</h3>
                                        <p>Enable or disable pay at counter option (useful for events requiring only online payments)</p>
                                    </div>
                                </div>
                                <div className="payment-status">
                                    <span className={`status-indicator ${settings.payAtCounterEnabled ? 'enabled' : 'disabled'}`}>
                                        {settings.payAtCounterEnabled ? <><FiCheckCircle style={{color:'#27ae60'}} /> Pay at Counter Enabled</> : <><FiXCircle style={{color:'#e74c3c'}} /> Pay at Counter Disabled</>}
                                    </span>
                                </div>
                                <button 
                                    className={`admin-control-button ${settings.payAtCounterEnabled ? 'disable-btn' : 'enable-btn'}`}
                                    onClick={togglePayAtCounter}
                                >
                                    {settings.payAtCounterEnabled ? 'Disable Pay at Counter' : 'Enable Pay at Counter'}
                                </button>
                            </div>

                            <div className="setting-card">
                                <div className="setting-header">
                                    <div className="setting-icon"><FiRefreshCw /></div>
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
                        <h2><FiHome /> Welcome to Admin Dashboard</h2>
                        <div className="dashboard-welcome">
                            <div className="welcome-icon"><FiSettings /></div>
                            <h3>Select an option from the sidebar</h3>
                            <p>Use the navigation menu to manage your restaurant's menu, configure settings, and more.</p>
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
                        onTouchEnd={(e) => { e.preventDefault(); setCurrentView('menu'); }}
                        onClick={() => setCurrentView('menu')}
                    >
                        <span className="nav-icon"><FiList /></span>
                        <span className="nav-text">Menu Items</span>
                    </button>
                    
                    <button 
                        className={`nav-item ${currentView === 'categories' ? 'active' : ''}`}
                        onTouchEnd={(e) => { e.preventDefault(); setCurrentView('categories'); }}
                        onClick={() => setCurrentView('categories')}
                    >
                        <span className="nav-icon"><FiTag /></span>
                        <span className="nav-text">Categories</span>
                    </button>
                    
                    {adminRole === 'owner' && (
                    <button 
                        className={`nav-item ${currentView === 'analytics' ? 'active' : ''}`}
                        onTouchEnd={(e) => { e.preventDefault(); setCurrentView('analytics'); }}
                        onClick={() => setCurrentView('analytics')}
                    >
                        <span className="nav-icon"><FiBarChart2 /></span>
                        <span className="nav-text">Analytics</span>
                    </button>
                    )}
                    
                    <button 
                        className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
                        onTouchEnd={(e) => { e.preventDefault(); setCurrentView('settings'); }}
                        onClick={() => setCurrentView('settings')}
                    >
                        <span className="nav-icon"><FiSettings /></span>
                        <span className="nav-text">Settings</span>
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