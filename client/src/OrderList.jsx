import React, { useEffect, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

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

    const pendingOrders = orders.filter(order => order.status === 'Pending');
    const completedOrders = orders.filter(order => order.status === 'Completed');

    return (
        <div className="order-list-container">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, gap: '10px' }}>
                <button
                    style={{
                        fontSize: '24px',
                        width: '250px', // Set a fixed width
                        textAlign: 'center',
                    }}
                    className={view === 'pending' ? 'active-tab' : ''}
                    onClick={() => setView('pending')}
                >
                    Pending Orders
                </button>
                <button
                    style={{
                        fontSize: '24px',
                        width: '250px', // Set the same fixed width
                        textAlign: 'center',
                    }}
                    className={view === 'completed' ? 'active-tab' : ''}
                    onClick={() => setView('completed')}
                >
                    Past Orders
                </button>
            </div>
            {view === 'pending' && (
                <>
                    <h1>Pending Orders</h1>
                    <ul>
                        {pendingOrders.length === 0 && <li>No pending orders.</li>}
                        {pendingOrders.map(order => {
                            // Group items and count quantities
                            const itemCounts = {};
                            order.items.forEach(item => {
                                itemCounts[item] = (itemCounts[item] || 0) + 1;
                            });

                            // Calculate total
                            const total = Object.entries(itemCounts).reduce((sum, [name, qty]) => {
                                const menuItem = [
                                    { name: 'Mango Lassi', price: 3 },
                                    { name: 'Panipuri', price: 3 },
                                    { name: 'Masala Puri', price: 4 },
                                    { name: 'Dahipuri', price: 6 },
                                    { name: 'Sevpuri', price: 6 },
                                    { name: 'Bhelpuri', price: 7 },
                                    { name: 'Paneer Wrap', price: 7 }
                                ].find(i => i.name === name);
                                return sum + (menuItem ? menuItem.price * qty : 0);
                            }, 0);

                            return (
                                <li key={order._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', fontSize: 28 }}>
                                            Order #{order._id.slice(-4)} - {order.customerName}
                                        </span>
                                        <ul style={{ margin: '8px 0 0 0', padding: 0 }}>
                                            {Object.entries(itemCounts).map(([name, qty]) => (
                                                <li key={name} style={{ background: 'none', padding: 0, margin: 0, fontSize: 24 }}>
                                                    {name}{qty > 1 ? ` x${qty}` : ''}
                                                </li>
                                            ))}
                                        </ul>
                                        <div style={{ marginTop: 6, fontWeight: 'bold', color: '#b85c38', fontSize: 24 }}>
                                            Total: ${total}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => completeOrder(order._id)}
                                            style={{
                                                height: '120px',
                                                minWidth: '120px',
                                                padding: '10px 0',
                                                fontSize: 18,
                                                fontWeight: 'bold',
                                                background: '#b85c38',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                transition: 'background 0.2s'
                                            }}
                                        >
                                            Complete
                                        </button>
                                        <button
                                            onClick={() => markAsPaid(order._id)}
                                            style={{
                                                height: '120px',
                                                minWidth: '120px',
                                                padding: '10px 0',
                                                fontSize: 18,
                                                fontWeight: 'bold',
                                                background: paidOrders[order._id] ? 'green' : '#b85c38',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                transition: 'background 0.2s'
                                            }}
                                        >
                                            {paidOrders[order._id] ? 'Paid' : 'Mark as Paid'}
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
                    <ul>
                        {completedOrders.length === 0 && <li>No completed orders.</li>}
                        {[...completedOrders].reverse().map(order => {
                            const itemCounts = {};
                            order.items.forEach(item => {
                                itemCounts[item] = (itemCounts[item] || 0) + 1;
                            });

                            const total = Object.entries(itemCounts).reduce((sum, [name, qty]) => {
                                const menuItem = [
                                    { name: 'Mango Lassi', price: 3 },
                                    { name: 'Panipuri', price: 3 },
                                    { name: 'Masala Puri', price: 4 },
                                    { name: 'Dahipuri', price: 6 },
                                    { name: 'Sevpuri', price: 6 },
                                    { name: 'Bhelpuri', price: 7 },
                                    { name: 'Paneer Wrap', price: 8 }
                                ].find(i => i.name === name);
                                return sum + (menuItem ? menuItem.price * qty : 0);
                            }, 0);

                            return (
                                <li key={order._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', fontSize: 28 }}>
                                            Order #{order._id.slice(-4)} - {order.customerName}
                                        </span>
                                        <ul style={{ margin: '8px 0 0 0', padding: 0 }}>
                                            {Object.entries(itemCounts).map(([name, qty]) => (
                                                <li key={name} style={{ background: 'none', padding: 0, margin: 0, fontSize: 24 }}>
                                                    {name}{qty > 1 ? ` x${qty}` : ''}
                                                </li>
                                            ))}
                                        </ul>
                                        <div style={{ marginTop: 6, fontWeight: 'bold', color: '#b85c38', fontSize: 24 }}>
                                            Total: ${total}
                                        </div>
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