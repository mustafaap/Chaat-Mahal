import React, { useState } from 'react';
import axios from 'axios';

const KioskForm = () => {
    const [customerName, setCustomerName] = useState('');
    const [selectedItems, setSelectedItems] = useState({});
    const [step, setStep] = useState(1);
    const [orderNumber, setOrderNumber] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false); // Track submission state

    const menuItems = [
        { id: 1, name: 'Mango Lassi', price: 3, image: '/images/mango-lassi.jpg' },
        { id: 2, name: 'Panipuri', price: 3, image: '/images/panipuri.JPG' },
        { id: 3, name: 'Masala Puri', price: 4, image: '/images/masala-puri.JPG' },
        { id: 4, name: 'Dahipuri', price: 6, image: '/images/dahipuri.JPG' },
        { id: 5, name: 'Sevpuri', price: 6, image: '/images/sevpuri.JPG' },
        { id: 6, name: 'Bhelpuri', price: 7, image: '/images/bhelpuri.JPG' },
        { id: 7, name: 'Paneer Wrap', price: 8, image: '/images/paneer-wrap.JPG' },
    ];

    const handleQuantityChange = (itemName, quantity) => {
        setSelectedItems(prev => {
            const updated = { ...prev };
            if (quantity > 0) {
                updated[itemName] = quantity;
            } else {
                delete updated[itemName];
            }
            return updated;
        });
    };

    const handleMenuSubmit = (e) => {
        e.preventDefault();
        const items = Object.entries(selectedItems)
            .flatMap(([name, qty]) => Array(Number(qty)).fill(name));
        if (items.length > 0) {
            setStep(2);
        }
    };

    const handleNameSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return; // Prevent multiple submissions

        setIsSubmitting(true); // Disable the button
        const items = Object.entries(selectedItems)
            .flatMap(([name, qty]) => Array(Number(qty)).fill(name));
        if (customerName.trim() && items.length > 0) {
            const order = {
                customerName,
                items,
                status: 'Pending',
            };
            try {
                const response = await axios.post('/api/orders', order);
                const fullOrderId = response.data._id; // Full ObjectId
                setOrderNumber(fullOrderId.slice(-4)); // Use the last 4 characters
                setStep(3);
            } catch (error) {
                console.error('Error placing order:', error);
                alert('There was an error placing your order. Please try again.');
            } finally {
                setIsSubmitting(false); // Re-enable the button
            }
        } else {
            setIsSubmitting(false); // Re-enable the button if validation fails
        }
    };

    return (
        <div>
            {step === 1 && (
                <form onSubmit={handleMenuSubmit}>
                    <h2>Select Menu Items</h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '24px',
                        margin: '24px 0'
                    }}>
                        {menuItems.map(item => (
                            <div
                                key={item.id}
                                style={{
                                    background: '#f9f9f9',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    textAlign: 'center',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                }}
                            >
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    style={{
                                        width: '100%',
                                        height: '185px',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        marginBottom: '10px'
                                    }}
                                />
                                <div style={{ marginTop: 8 }}>
                                    <hr />
                                    <label
                                        htmlFor={`qty-${item.name}`}
                                        style={{ fontWeight: 'bold', fontSize: '1.25rem', display: 'block', margin: '12px 0 6px 0' }}
                                    >
                                        {item.name} - ${item.price}
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
                                        <button
                                            type="button"
                                            onClick={() => handleQuantityChange(item.name, Math.max((selectedItems[item.name] || 0) - 1, 0))}
                                            style={{
                                                width: 36, height: 36, fontSize: 22, borderRadius: '50%', border: '1px solid #ccc',
                                                color: '#fff', background: '#b85c38', cursor: 'pointer', marginRight: 8, padding: 0, paddingBottom: '1px'
                                            }}
                                        >-</button>
                                        <span style={{ minWidth: 24, display: 'inline-block', fontSize: 24, fontWeight: 'bold' }}>
                                            {selectedItems[item.name] || 0}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleQuantityChange(item.name, Math.min((selectedItems[item.name] || 0) + 1, 20))}
                                            style={{
                                                width: 36, height: 36, fontSize: 22, borderRadius: '50%', border: '1px solid #ccc',
                                                color: '#fff', background: 'green', cursor: 'pointer', marginLeft: 8, padding: 0, paddingTop: '1px'
                                            }}
                                        >+</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="next-button-container" style={{ textAlign: 'center'}}>
                        <button style={{  fontSize: '25px'}} type="submit">Next</button>
                    </div>
                </form>
            )}
            {step === 2 && (
                <form onSubmit={handleNameSubmit}>
                    <div className="back-button-container" style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            style={{
                                background: '#fff',
                                border: '2px solid #b85c38',
                                color: '#b85c38',
                                fontSize: 25,
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                padding: '8px 28px',
                                borderRadius: 8,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                transition: 'background 0.2s, color 0.2s'
                            }}
                        >
                            &#8592; Back
                        </button>
                    </div>
                    <div style={{
                        background: '#f3e9e3',
                        borderRadius: '10px',
                        padding: '18px 20px',
                        marginBottom: '24px',
                        maxWidth: 400,
                        marginLeft: 'auto',
                        marginRight: 'auto'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: 12, color: '#b85c38', fontSize: '2rem' }}>Your Order</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {Object.entries(selectedItems)
                                .filter(([_, qty]) => qty > 0)
                                .map(([name, qty]) => (
                                    <li key={name} style={{ fontSize: '1.4rem', marginBottom: 6 }}>
                                        <span style={{ fontWeight: 'bold' }}>{name}</span> &times; {qty}
                                    </li>
                                ))}
                        </ul>
                        <div style={{ marginTop: 10, fontWeight: 'bold', fontSize: '1.8rem' }}>
                            Total: $
                            {Object.entries(selectedItems)
                                .reduce((sum, [name, qty]) => {
                                    const item = menuItems.find(i => i.name === name);
                                    return sum + (item ? item.price * qty : 0);
                                }, 0)
                            }
                        </div>
                        <div style={{ fontWeight: 'bold', marginTop: "5px" }}>*Taxes applied to card and tap payments only</div>
                    </div>
                    <h2>Enter Your Name</h2>
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                    />
                    <div className="order-button-container" style={{ textAlign: 'center' }}>
                        <button
                            style={{ fontSize: '25px' }}
                            type="submit"
                            disabled={isSubmitting} // Disable the button while submitting
                        >
                            {isSubmitting ? 'Placing Order...' : 'Place Order'}
                        </button>
                    </div>
                </form>
            )}
            {step === 3 && (
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    <h2>Order Confirmation</h2>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Order Number: {orderNumber}</p>
                    <p style={{ fontSize: '1.5rem' }}>Name: {customerName}</p>
                    <h3 style={{ marginTop: '20px' }}>Items Ordered:</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {Object.entries(selectedItems)
                            .filter(([_, qty]) => qty > 0)
                            .map(([name, qty]) => (
                                <li key={name} style={{ fontSize: '1.4rem', marginBottom: 6 }}>
                                    <span style={{ fontWeight: 'bold' }}>{name}</span> &times; {qty}
                                </li>
                            ))}
                    </ul>
                    <div style={{ marginTop: 10, fontWeight: 'bold', fontSize: '1.8rem', color: '#b85c38' }}>
                        Total: $
                        {Object.entries(selectedItems).reduce((sum, [name, qty]) => {
                            const item = menuItems.find(i => i.name === name);
                            return sum + (item ? item.price * qty : 0);
                        }, 0)}
                    </div>
                    <div style={{ fontWeight: 'bold', marginTop: "5px", color: '#b85c38' }}>*Taxes applied to card and tap payments only</div>
                    <p style={{ marginTop: '20px', fontSize: '1.4rem', fontWeight: 'bold', color: '#b85c38' }}>
                        Please pay at the counter to enter the order preparation line.
                    </p>
                    <div className="anotherorder-button-container" style={{ marginTop: '20px' }}>
                        <button
                            onClick={() => {
                                setStep(1);
                                setSelectedItems({}); // Reset all selected items
                                setCustomerName(''); // Reset the customer name
                            }}
                            style={{
                                background: '#b85c38',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontSize: '1.2rem',
                                cursor: 'pointer'
                            }}
                        >
                            Place Another Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KioskForm;
