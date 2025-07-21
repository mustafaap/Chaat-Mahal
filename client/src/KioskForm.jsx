import React, { useState } from 'react';
import axios from 'axios';

const KioskForm = () => {
    const [customerName, setCustomerName] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);

    const menuItems = [
        { id: 1, name: 'Samosa', price: 2 },
        { id: 2, name: 'Chaat', price: 3 },
        { id: 3, name: 'Biryani', price: 5 },
        { id: 4, name: 'Paneer Tikka', price: 4 },
    ];

    const handleItemSelect = (item) => {
        setSelectedItems((prevItems) => 
            prevItems.includes(item) ? prevItems.filter(i => i !== item) : [...prevItems, item]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (customerName && selectedItems.length > 0) {
            const order = {
                customerName,
                items: selectedItems,
                status: 'Pending',
            };
            await axios.post('/api/orders', order);
            setCustomerName('');
            setSelectedItems([]);
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input 
                    type="text" 
                    placeholder="Enter your name" 
                    value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)} 
                    required 
                />
                <h2>Select Menu Items:</h2>
                {menuItems.map(item => (
                    <div key={item.id}>
                        <input 
                            type="checkbox" 
                            id={item.name} 
                            value={item.name} 
                            checked={selectedItems.includes(item.name)} 
                            onChange={() => handleItemSelect(item.name)} 
                        />
                        <label htmlFor={item.name}>{item.name} - ${item.price}</label>
                    </div>
                ))}
                <button type="submit">Place Order</button>
            </form>
        </div>
    );
};

export default KioskForm;