import React from 'react';
import axios from 'axios';
import './styles/AdminControls.css';

const AdminControls = () => {
    const resetAllOrders = async () => {
        if (window.confirm('Are you sure you want to reset all orders? This action cannot be undone.')) {
            try {
                await axios.delete('/api/orders');
                alert('All orders have been reset successfully.');
            } catch (error) {
                console.error('Error resetting orders:', error);
                alert('Failed to reset orders. Please try again.');
            }
        }
    };

    return (
        <div className="admin-controls-container">
            <h1>Admin Controls</h1>
            <p className="controls-subtitle">Manage system settings and data</p>
            
            <div className="controls-grid">
                <div className="control-card">
                    <div className="control-icon">🔄</div>
                    <h3>Reset Orders</h3>
                    <p>Remove all orders from the system (both pending and completed)</p>
                    <button 
                        onClick={resetAllOrders}
                        className="admin-control-button reset-btn"
                    >
                        Reset All Orders
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
        </div>
    );
};

export default AdminControls;