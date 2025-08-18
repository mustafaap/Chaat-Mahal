import React, { useEffect, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import ConfirmationModal from './components/ConfirmationModal';
import './styles/OrderList.css';

const socket = io();

const OrderList = ({ currentView, setCurrentView }) => {
    const [orders, setOrders] = useState([]);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [givenItems, setGivenItems] = useState({});
    
    // Modal states
    const [modalState, setModalState] = useState({
        isOpen: false,
        type: 'default',
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: null
    });

    const [localView, setLocalView] = useState('pending');
    const view = currentView || localView;
    const setView = setCurrentView || setLocalView;

    const fetchOrders = async () => {
        const response = await axios.get('/api/orders/all');
        setOrders(response.data);
    };

    useEffect(() => {
        fetchOrders();
        socket.on('ordersUpdated', fetchOrders);
        return () => {
            socket.off('ordersUpdated', fetchOrders);
        };
    }, []);

    // Scroll to top functionality
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.pageYOffset > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Add this useEffect to scroll to top when view changes
    useEffect(() => {
        // Scroll to top when view changes
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [view]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Modal helper functions
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

    const completeOrder = async (id) => {
        openModal({
            type: 'default',
            title: 'Complete Order',
            message: 'Are you sure you want to mark this order as completed? This action will move the order to the completed section.',
            confirmText: 'Complete Order',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.patch(`/api/orders/${id}`, { status: 'Completed' });
                    setOrders(orders.map(order =>
                        order._id === id ? { ...order, status: 'Completed' } : order
                    ));
                    // Clear given items for this order when completed
                    setGivenItems(prev => {
                        const updated = { ...prev };
                        delete updated[id];
                        return updated;
                    });
                } catch (error) {
                    console.error('Error completing order:', error);
                    alert('Failed to complete order. Please try again.');
                }
            }
        });
    };

    const markAsPaid = async (id) => {
        try {
            const currentOrder = orders.find(order => order._id === id);
            const newPaidStatus = !currentOrder.paid;
            
            await axios.patch(`/api/orders/${id}/paid`, { paid: newPaidStatus });
            
            setOrders(orders.map(order =>
                order._id === id ? { ...order, paid: newPaidStatus } : order
            ));
        } catch (error) {
            console.error('Error updating paid status:', error);
            alert('Failed to update paid status. Please try again.');
        }
    };

    const deleteOrder = async (id) => {
        openModal({
            type: 'danger',
            title: 'Cancel Order',
            message: 'Are you sure you want to cancel this order? This action will move the order to the cancelled section and cannot be undone easily.',
            confirmText: 'Cancel Order',
            cancelText: 'Keep Order',
            onConfirm: async () => {
                try {
                    await axios.delete(`/api/orders/${id}`);
                    setOrders(orders.map(order =>
                        order._id === id ? { ...order, status: 'Cancelled' } : order
                    ));
                    // Clear given items for this order when cancelled
                    setGivenItems(prev => {
                        const updated = { ...prev };
                        delete updated[id];
                        return updated;
                    });
                } catch (error) {
                    console.error('Error deleting order:', error);
                    alert('Failed to delete the order. Please try again.');
                }
            }
        });
    };

    // Revert functions for completed and cancelled orders
    const revertOrderToPending = async (id) => {
        openModal({
            type: 'warning',
            title: 'Revert Order',
            message: 'Are you sure you want to move this order back to pending? The order will appear in the pending section.',
            confirmText: 'Revert to Pending',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.patch(`/api/orders/${id}`, { status: 'Pending' });
                    setOrders(orders.map(order =>
                        order._id === id ? { ...order, status: 'Pending' } : order
                    ));
                } catch (error) {
                    console.error('Error reverting order:', error);
                    alert('Failed to revert order. Please try again.');
                }
            }
        });
    };

    // Toggle item as given/not given
    const toggleItemGiven = (orderId, itemKey) => {
        setGivenItems(prev => {
            const orderItems = prev[orderId] || {};
            const updated = {
                ...prev,
                [orderId]: {
                    ...orderItems,
                    [itemKey]: !orderItems[itemKey]
                }
            };
            return updated;
        });
    };

    // Check if all items in an order have been given
    const areAllItemsGiven = (orderId, itemCounts) => {
        const orderGivenItems = givenItems[orderId] || {};
        return Object.keys(itemCounts).every(itemName => orderGivenItems[itemName]);
    };

    // Calculate completion percentage
    const getCompletionPercentage = (orderId, itemCounts) => {
        const orderGivenItems = givenItems[orderId] || {};
        const totalItems = Object.keys(itemCounts).length;
        const givenCount = Object.keys(itemCounts).filter(itemName => orderGivenItems[itemName]).length;
        return totalItems > 0 ? Math.round((givenCount / totalItems) * 100) : 0;
    };

    // Helper function to calculate time since order was placed
    const getOrderAge = (createdAt) => {
        const now = new Date();
        const orderTime = new Date(createdAt);
        const diffMinutes = Math.floor((now - orderTime) / (1000 * 60));
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        const hours = Math.floor(diffMinutes / 60);
        if (hours < 24) return `${hours}h ${diffMinutes % 60}m ago`;
        return `${Math.floor(hours / 24)} days ago`;
    };

    const pendingOrders = orders.filter(order => order.status === 'Pending');
    const completedOrders = orders.filter(order => order.status === 'Completed');
    const cancelledOrders = orders.filter(order => order.status === 'Cancelled');

    return (
        <div className="order-list-container">
            {!currentView && (
                <div className="order-list-nav">
                    <div className="order-list-nav-buttons">
                        <button
                            className={`nav-tab-button ${view === 'pending' ? 'active-tab' : ''}`}
                            onClick={() => setView('pending')}
                        >
                            🔄 Pending Orders ({pendingOrders.length})
                        </button>
                        <button
                            className={`nav-tab-button ${view === 'completed' ? 'active-tab' : ''}`}
                            onClick={() => setView('completed')}
                        >
                            ✅ Completed Orders ({completedOrders.length})
                        </button>
                        <button
                            className={`nav-tab-button ${view === 'cancelled' ? 'active-tab' : ''}`}
                            onClick={() => setView('cancelled')}
                        >
                            ❌ Cancelled Orders ({cancelledOrders.length})
                        </button>
                    </div>
                </div>
            )}

            {view === 'pending' && (
                <>
                    <h1>Pending Orders ({pendingOrders.length})</h1>
                    <ul className="orders-list">
                        {pendingOrders.length === 0 && <li className="empty-orders">No pending orders to prepare! 🎉</li>}
                        {pendingOrders
                            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                            .map(order => {
                                const itemCounts = {};
                                order.items.forEach(item => {
                                    itemCounts[item] = (itemCounts[item] || 0) + 1;
                                });

                                const orderAge = getOrderAge(order.createdAt);
                                const completionPercentage = getCompletionPercentage(order._id, itemCounts);
                                const allItemsGiven = areAllItemsGiven(order._id, itemCounts);

                                return (
                                    <li key={order._id} className={`order-item ${allItemsGiven ? 'all-items-given' : ''} ${order.paid ? 'order-paid' : ''}`}>
                                        <div className="order-info">
                                            <div className="order-header">
                                                <div className="order-header-main">
                                                    Order #{order.orderNumber || order._id.slice(-4)} - {order.customerName}
                                                    <span className="order-timestamp">
                                                        {orderAge}
                                                    </span>
                                                </div>
                                                
                                                {/* Progress Bar */}
                                                <div className="order-progress-container">
                                                    <div className="order-progress-bar">
                                                        <div 
                                                            className="order-progress-fill" 
                                                            style={{ width: `${completionPercentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="order-progress-text">
                                                        {completionPercentage}% Complete
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="order-info-section">
                                                <div className="info-card">
                                                    <div className="order-items">
                                                        <div className="order-items-header">
                                                            Items to Prepare ({Object.keys(itemCounts).filter(itemName => givenItems[order._id]?.[itemName]).length}/{Object.keys(itemCounts).length} Given)
                                                        </div>
                                                        {Object.entries(itemCounts).map(([name, qty]) => {
                                                            const isGiven = givenItems[order._id]?.[name];
                                                            return (
                                                                <div 
                                                                    key={name} 
                                                                    className={`order-item-detail ${isGiven ? 'item-given' : 'item-pending'}`}
                                                                    onClick={() => toggleItemGiven(order._id, name)}
                                                                >
                                                                    <div className="item-content">
                                                                        <span className="item-checkbox">
                                                                            {isGiven ? '✅' : '⭕'}
                                                                        </span>
                                                                        <div className="item-details">
                                                                            <strong>{qty}x</strong> {name}
                                                                        </div>
                                                                        <span className={`item-status ${isGiven ? 'item-given' : 'item-pending'}`}>
                                                                            {isGiven ? 'GIVEN' : 'PENDING'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                
                                                <div className="info-card">
                                                    <div className="admin-order-total">
                                                        Total: ${order.total}
                                                    </div>
                                                </div>
                                            </div>

                                            {order.notes && (
                                                <div className="order-notes">
                                                    <strong>Special Instructions:</strong> {order.notes}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="order-controls">
                                            {!order.paid ? (
                                                // Unpaid state: Mark as Paid (top), Cancel (bottom full width)
                                                <>
                                                    <button
                                                        onClick={() => markAsPaid(order._id)}
                                                        className="control-button paid-button main-action-btn"
                                                        title="Mark as paid to start preparation"
                                                    >
                                                        Mark as Paid
                                                    </button>
                                                    <button
                                                        onClick={() => deleteOrder(order._id)}
                                                        className="control-button delete-button full-width-btn"
                                                        title="Cancel/Delete order"
                                                    >
                                                        Cancel Order
                                                    </button>
                                                </>
                                            ) : (
                                                // Paid state: Complete (top), Undo and Cancel (bottom split)
                                                <>
                                                    <button
                                                        onClick={() => completeOrder(order._id)}
                                                        className={`control-button complete-button main-action-btn ${allItemsGiven ? 'ready-to-complete' : ''}`}
                                                        title="Mark order as completed"
                                                    >
                                                        Complete Order
                                                    </button>
                                                    <div className="bottom-controls">
                                                        <button
                                                            onClick={() => markAsPaid(order._id)}
                                                            className="control-button undo-payment-button half-width-btn"
                                                            title="Undo payment - mark as unpaid"
                                                        >
                                                            Undo Payment
                                                        </button>
                                                        <button
                                                            onClick={() => deleteOrder(order._id)}
                                                            className="control-button delete-button half-width-btn"
                                                            title="Cancel/Delete order"
                                                        >
                                                            Cancel Order
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                    </ul>
                </>
            )}

            {view === 'completed' && (
                <>
                    <h1>Completed Orders ({completedOrders.length})</h1>
                    <ul className="orders-list">
                        {completedOrders.length === 0 && 
                            <li className="empty-orders">No completed orders yet! 📝</li>}
                        {completedOrders
                            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
                            .map(order => {
                                const itemCounts = {};
                                order.items.forEach(item => {
                                    itemCounts[item] = (itemCounts[item] || 0) + 1;
                                });

                                const completedTime = getOrderAge(order.updatedAt || order.createdAt);

                                return (
                                    <li key={order._id} className={`order-item ${order.paid ? 'order-paid' : ''}`}>
                                        <div className="order-info">
                                            <div className="order-header">
                                                <div className="order-header-with-revert">
                                                    <div className="order-header-main">
                                                        Order #{order._id.slice(-4)} - {order.customerName}
                                                        <span className="order-timestamp">
                                                            Completed {completedTime}
                                                        </span>
                                                    </div>
                                                    <button 
                                                        className="revert-btn"
                                                        onClick={() => revertOrderToPending(order._id)}
                                                        title="Move back to pending"
                                                    >
                                                        <span>↶</span>
                                                        <span>Revert</span>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="order-info-section">
                                                <div className="info-card">
                                                    <div className="order-items">
                                                        <div className="order-items-header">
                                                            Items Ordered
                                                        </div>
                                                        {Object.entries(itemCounts).map(([name, qty]) => (
                                                            <div key={name} className="order-item-detail">
                                                                <strong>{qty}x</strong> {name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div className="info-card">
                                                    <div className="admin-order-total">
                                                        Total: ${order.total}
                                                    </div>
                                                </div>
                                            </div>

                                            {order.notes && (
                                                <div className="order-notes">
                                                    <strong>Customer Notes:</strong> {order.notes}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                    </ul>
                </>
            )}

            {view === 'cancelled' && (
                <>
                    <h1>Cancelled Orders ({cancelledOrders.length})</h1>
                    <ul className="orders-list">
                        {cancelledOrders.length === 0 && 
                            <li className="empty-orders">No cancelled orders! 🎉</li>}
                        {cancelledOrders
                            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
                            .map(order => {
                                const itemCounts = {};
                                order.items.forEach(item => {
                                    itemCounts[item] = (itemCounts[item] || 0) + 1;
                                });

                                const cancelledTime = getOrderAge(order.updatedAt || order.createdAt);

                                return (
                                    <li key={order._id} className={`order-item ${order.paid ? 'order-paid' : ''}`}>
                                        <div className="order-info">
                                            <div className="order-header">
                                                <div className="order-header-with-revert">
                                                    <div className="order-header-main">
                                                        Order #{order._id.slice(-4)} - {order.customerName}
                                                        <span className="order-timestamp">
                                                            Cancelled {cancelledTime}
                                                        </span>
                                                    </div>
                                                    <button 
                                                        className="revert-btn"
                                                        onClick={() => revertOrderToPending(order._id)}
                                                        title="Move back to pending"
                                                    >
                                                        <span>↶</span>
                                                        <span>Revert</span>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="order-info-section">
                                                <div className="info-card">
                                                    <div className="order-items">
                                                        <div className="order-items-header">
                                                            Items Ordered
                                                        </div>
                                                        {Object.entries(itemCounts).map(([name, qty]) => (
                                                            <div key={name} className="order-item-detail">
                                                                <strong>{qty}x</strong> {name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div className="info-card">
                                                    <div className="admin-order-total">
                                                        Total: ${order.total}
                                                    </div>
                                                </div>
                                            </div>

                                            {order.notes && (
                                                <div className="order-notes">
                                                    <strong>Customer Notes:</strong> {order.notes}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                    </ul>
                </>
            )}

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

            {/* Scroll to Top Button */}
            {showScrollTop && (
                <button 
                    className="scroll-to-top-btn"
                    onClick={scrollToTop}
                    title="Back to top"
                >
                    ↑
                </button>
            )}
        </div>
    );
};

export default OrderList;