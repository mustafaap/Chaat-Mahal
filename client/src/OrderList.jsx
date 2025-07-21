import React, { useEffect, useState } from 'react';
import axios from 'axios';

const OrderList = () => {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const fetchOrders = async () => {
            const response = await axios.get('/api/orders');
            setOrders(response.data);
        };

        fetchOrders();
    }, []);

    const completeOrder = async (id) => {
        await axios.patch(`/api/orders/${id}`, { status: 'completed' });
        setOrders(orders.filter(order => order._id !== id));
    };

    return (
        <div>
            <h2>Order List</h2>
            <ul>
                {orders.map(order => (
                    <li key={order._id}>
                        <span>{order.customerName}: {order.items.join(', ')}</span>
                        <button onClick={() => completeOrder(order._id)}>Complete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default OrderList;