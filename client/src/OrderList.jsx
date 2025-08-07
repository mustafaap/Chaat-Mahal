import React, { useEffect, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './styles/OrderList.css';

const socket = io(); // Automatically uses the same origin

const OrderList = () => {
    const [orders, setOrders] = useState([]);
    const [view, setView] = useState('pending'); // 'pending' or 'completed'
    const [paidOrders, setPaidOrders] = useState({}); // Track paid orders

    const fetchOrders = async () => {
        const response = await axios.get('/api/orders/all'); // new endpoint to get all orders
        setOrders(response.data);
    };

    useEffect(() => {
        fetchOrders();

        socket.on('ordersUpdated', fetchOrders);

        return () => {
            socket.off('ordersUpdated', fetchOrders);
        };
    }, []);

    const completeOrder = async (id) => {
        await axios.patch(`/api/orders/${id}`, { status: 'completed' });
        setOrders(orders.map(order =>
            order._id === id ? { ...order, status: 'Completed' } : order
        ));
    };

    const markAsPaid = (id) => {
        setPaidOrders(prev => ({
            ...prev,
            [id]: !prev[id] // Toggle the paid status
        }));
    };

    const deleteOrder = async (id) => {
        try {
            await axios.delete(`/api/orders/${id}`);
            setOrders(orders.map(order =>
                order._id === id ? { ...order, status: 'Cancelled' } : order
            ));
        } catch (error) {
            console.error('Error deleting order:', error);
            alert('Failed to delete the order. Please try again.');
        }
    };

    const resetAllOrders = async () => {
        if (window.confirm('Are you sure you want to reset all orders? This action cannot be undone.')) {
            try {
                await axios.delete('/api/orders');
                setOrders([]); // Clear all orders from the state
            } catch (error) {
                console.error('Error resetting orders:', error);
                alert('Failed to reset orders. Please try again.');
            }
        }
    };

    const pendingOrders = orders.filter(order => order.status === 'Pending');
    const completedOrders = orders.filter(order => order.status === 'Completed');

    return (
        <div className="order-list-container">
            <div className="order-list-nav">
                <div className="order-list-nav-buttons">
                    <button
                        className={`nav-tab-button ${view === 'pending' ? 'active-tab' : ''}`}
                        onClick={() => setView('pending')}
                    >
                        Pending Orders
                    </button>
                    <button
                        className={`nav-tab-button ${view === 'completed' ? 'active-tab' : ''}`}
                        onClick={() => setView('completed')}
                    >
                        Past Orders
                    </button>
                </div>
                <button
                    onClick={resetAllOrders}
                    className="reset-button"
                >
                    Reset All Orders
                </button>
            </div>
            {view === 'pending' && (
                <>
                    <h1>Pending Orders</h1>
                    <ul className="orders-list">
                        {pendingOrders.length === 0 && <li className="empty-orders">No pending orders.</li>}
                        {pendingOrders.map(order => {
                            // Group items and count quantities
                            const itemCounts = {};
                            order.items.forEach(item => {
                                itemCounts[item] = (itemCounts[item] || 0) + 1;
                            });

                            return (
                                <li key={order._id} className="order-item">
                                    <div className="order-info">
                                        <span className="order-header">
                                            Order #{order._id.slice(-4)} - {order.customerName}
                                        </span>
                                        <ul className="order-items">
                                            {Object.entries(itemCounts).map(([name, qty]) => (
                                                <li key={name} className="order-item-detail">
                                                    {name}{qty > 1 ? ` x${qty}` : ''}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="order-total">
                                            Total: ${order.total}
                                        </div>
                                        {order.notes && (
                                            <div className="order-notes">
                                                <strong>Notes:</strong> {order.notes}
                                            </div>
                                        )}
                                    </div>
                                    <div className="order-controls">
                                        <button
                                            onClick={() => completeOrder(order._id)}
                                            className="control-button complete-button"
                                        >
                                            Complete
                                        </button>
                                        <button
                                            onClick={() => markAsPaid(order._id)}
                                            className={`control-button paid-button ${paidOrders[order._id] ? 'is-paid' : ''}`}
                                        >
                                            {paidOrders[order._id] ? 'Paid' : 'Mark as Paid'}
                                        </button>
                                        <button
                                            onClick={() => deleteOrder(order._id)}
                                            className="control-button delete-button"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
            {view === 'completed' && (
                <>
                    <h1>Past Orders</h1>
                    <ul className="orders-list">
                        {completedOrders.length === 0 && orders.filter(order => order.status === 'Cancelled').length === 0 && 
                            <li className="empty-orders">No past orders.</li>}
                        {[...completedOrders, ...orders.filter(order => order.status === 'Cancelled')].reverse().map(order => {
                            const itemCounts = {};
                            order.items.forEach(item => {
                                itemCounts[item] = (itemCounts[item] || 0) + 1;
                            });

                            return (
                                <li key={order._id} className="order-item">
                                    <div className="order-info">
                                        <span className="order-header">
                                            Order #{order._id.slice(-4)} - {order.customerName}
                                        </span>
                                        <ul className="order-items">
                                            {Object.entries(itemCounts).map(([name, qty]) => (
                                                <li key={name} className="order-item-detail">
                                                    {name}{qty > 1 ? ` x${qty}` : ''}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="order-total">
                                            Total: ${order.total}
                                        </div>
                                        <div className={`order-status ${order.status === 'Completed' ? 'completed' : 'cancelled'}`}>
                                            Status: {order.status}
                                        </div>
                                        {order.notes && (
                                            <div className="order-notes">
                                                <strong>Notes:</strong> {order.notes}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </div>
    );
};

export default OrderList;