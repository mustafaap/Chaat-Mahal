import React, { useState } from 'react';
import axios from 'axios';

const KioskForm = () => {
    const [customerName, setCustomerName] = useState('');
    const [selectedItems, setSelectedItems] = useState({});
    const [step, setStep] = useState(1);
    const [orderNumber, setOrderNumber] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalItem, setModalItem] = useState(null);
    const [itemOptions, setItemOptions] = useState({});
    const [notes, setNotes] = useState(''); // Add this line

    const menuItems = [
        { id: 1, name: 'Mango Lassi', price: 3, image: '/images/mango-lassi.jpg', options: ['Ice', 'No Ice'] },
        { id: 2, name: 'Panipuri', price: 3, image: '/images/panipuri.JPG', options: ['Mild', 'Medium', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro'] },
        { id: 3, name: 'Masala Puri', price: 4, image: '/images/masala-puri.JPG', options: ['Mild', 'Medium', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro'] },
        { id: 4, name: 'Dahipuri', price: 6, image: '/images/dahipuri.JPG', options: ['Mild', 'Medium', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro'] },
        { id: 5, name: 'Sevpuri', price: 6, image: '/images/sevpuri.JPG', options: ['Mild', 'Medium', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro'] },
        { id: 6, name: 'Bhelpuri', price: 7, image: '/images/bhelpuri.JPG', options: ['Mild', 'Medium', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro'] },
        { id: 7, name: 'Paneer Wrap', price: 8, image: '/images/paneer-wrap.JPG', options: ['Mild', 'Medium', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro'] },
        { id: 8, name: 'Chicken Wrap', price: 9, image: '/images/chicken-wrap.JPG', options: ['Mild', 'Medium', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro'] },
    ];

    const handleQuantityChange = (itemName, quantity, options = []) => {
        setSelectedItems(prev => {
            const updated = { ...prev };
            const key = `${itemName}-${options.join('-')}`; // Create a unique key for each item-option combination
            const currentQuantity = updated[key]?.quantity || 0; // Default to 0 if the item is not yet in selectedItems
            if (quantity > 0) {
                updated[key] = { name: itemName, quantity: currentQuantity + 1, options };
            } else {
                delete updated[key];
            }
            return updated;
        });
    };

    const openModal = (item) => {
        setModalItem(item);
    };

    const closeModal = () => {
        setModalItem(null);
    };

    const handleOptionSubmit = () => {
        const options = itemOptions[modalItem.name] || [];
        const key = `${modalItem.name}-${options.join('-')}`; // Create a unique key for the item-option combination
        const currentQuantity = selectedItems[key]?.quantity || 0; // Default to 0 if the item is not yet in selectedItems
        handleQuantityChange(modalItem.name, currentQuantity + 1, options);
        setItemOptions(prev => ({ ...prev, [modalItem.name]: [] })); // Reset options for the item
        closeModal();
    };

    const handleMenuSubmit = (e) => {
        e.preventDefault();

        // Ensure quantities are valid positive integers
        const items = Object.entries(selectedItems)
            .flatMap(([name, { quantity }]) => {
                const validQuantity = Number(quantity) || 0; // Default to 0 if quantity is invalid
                return Array(validQuantity).fill(name);
            });

        if (items.length > 0) {
            setStep(2);
        } else {
            alert('Please select at least one item before proceeding.');
        }
    };

    const handleNameSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return; // Prevent multiple submissions

        setIsSubmitting(true); // Disable the button

        // Generate the items array based on the selectedItems structure
        const items = Object.entries(selectedItems)
            .flatMap(([name, { quantity }]) => {
                const validQuantity = Number(quantity) || 0; // Ensure quantity is a valid number
                return Array(validQuantity).fill(name);
            });

        if (customerName.trim() && items.length > 0) {
            const order = {
                customerName,
                items,
                notes: notes.trim(), // Add this line
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
            alert('Please enter your name and select at least one item.');
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
                                <img className='menu-item-image'
                                    src={item.image}
                                    alt={item.name}
                                />
                                <div style={{ marginTop: 8 }}>
                                    <hr />
                                    <label
                                        htmlFor={`qty-${item.name}`}
                                        style={{ fontWeight: 'bold', fontSize: '1.25rem', display: 'block', margin: '12px 0 6px 0' }}
                                    >
                                        {item.name} | ${item.price}
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Calculate total quantity for this item across all option combinations
                                                const totalQuantity = Object.entries(selectedItems)
                                                    .filter(([key]) => key.startsWith(`${item.name}-`))
                                                    .reduce((sum, [, itemData]) => sum + itemData.quantity, 0);
                                                
                                                if (totalQuantity > 0) {
                                                    // Find the first entry with this item name and reduce its quantity
                                                    const firstKey = Object.keys(selectedItems).find(key => key.startsWith(`${item.name}-`));
                                                    if (firstKey) {
                                                        const currentItem = selectedItems[firstKey];
                                                        if (currentItem.quantity > 1) {
                                                            setSelectedItems(prev => ({
                                                                ...prev,
                                                                [firstKey]: { ...currentItem, quantity: currentItem.quantity - 1 }
                                                            }));
                                                        } else {
                                                            setSelectedItems(prev => {
                                                                const updated = { ...prev };
                                                                delete updated[firstKey];
                                                                return updated;
                                                            });
                                                        }
                                                    }
                                                }
                                            }}
                                            style={{
                                                width: 36, height: 36, fontSize: 22, borderRadius: '50%', border: '1px solid #ccc',
                                                color: '#fff', background: '#b85c38', cursor: 'pointer', marginRight: 8, padding: 0, paddingBottom: '1px'
                                            }}
                                        >-</button>
                                        <span style={{ minWidth: 24, display: 'inline-block', fontSize: 24, fontWeight: 'bold' }}>
                                            {Object.entries(selectedItems)
                                                .filter(([key]) => key.startsWith(`${item.name}-`))
                                                .reduce((sum, [, itemData]) => sum + itemData.quantity, 0)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => openModal(item)}
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
                        <div style={{
                            maxWidth: '500px',
                            margin: '0 auto',
                            width: '100%'
                        }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {Object.entries(selectedItems)
                                    .filter(([_, { quantity }]) => quantity > 0) // Ensure quantity is greater than 0
                                    .map(([key, { name, quantity, options }]) => (
                                        <li key={key} style={{ fontSize: '1.4rem', marginBottom: 0, padding: '6px 10px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                <span style={{ fontWeight: 'bold' }}>{name}</span>
                                                {options.length > 0 && (
                                                    <span style={{ fontSize: '1rem', color: '#555', marginTop: 4, marginLeft: 20 }}>
                                                        Options: {options.join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                        <div style={{ marginTop: 10, fontWeight: 'bold', fontSize: '1.8rem' }}>
                            Total: $
                            {Object.entries(selectedItems)
                                .reduce((sum, [key, { name, quantity }]) => {
                                    const item = menuItems.find(i => i.name === name);
                                    return sum + (item ? item.price * quantity : 0);
                                }, 0)
                            }
                        </div>
                        {notes && (
                            <div style={{ marginTop: 15, padding: 10, background: '#f9f9f9', borderRadius: 6, fontSize: '1.2rem' }}>
                                <strong>Notes:</strong> {notes}
                            </div>
                        )}
                        <div style={{ fontWeight: 'bold', marginTop: "5px", color: '#b85c38' }}>*Taxes applied to card and tap payments only</div>
                    </div>
                    <h2>Enter Your Name</h2>
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                    />
                    <h2>Special Requests / Notes (Optional)</h2>
                    <textarea
                        placeholder="Enter any special requests, allergies, or notes here..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{
                            width: '100%',
                            padding: 10,
                            marginBottom: 18,
                            border: '1px solid #ccc',
                            borderRadius: 6,
                            fontSize: '1rem',
                            minHeight: '80px',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit'
                        }}
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
                    <div style={{
                        maxWidth: '500px',
                        margin: '0 auto',
                        width: '100%'
                    }}>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {Object.entries(selectedItems)
                                .filter(([_, { quantity }]) => quantity > 0) // Ensure quantity is greater than 0
                                .map(([key, { name, quantity, options }]) => (
                                    <li key={key} style={{ fontSize: '1.4rem', marginBottom: 0, padding: '6px 10px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <span style={{ fontWeight: 'bold' }}>{name}</span>
                                            {options.length > 0 && (
                                                <span style={{ fontSize: '1rem', color: '#555', marginTop: 4, marginLeft: 20 }}>
                                                    Options: {options.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                        </ul>
                    </div>
                    <div style={{ marginTop: 10, fontWeight: 'bold', fontSize: '1.8rem', color: '#b85c38' }}>
                        Total: $
                        {Object.entries(selectedItems).reduce((sum, [key, { name, quantity }]) => {
                            const item = menuItems.find(i => i.name === name);
                            return sum + (item ? item.price * quantity : 0);
                        }, 0)}
                    </div>
                    {notes && (
                        <div style={{ marginTop: 15, padding: 10, background: '#f9f9f9', borderRadius: 6, fontSize: '1.2rem' }}>
                            <strong>Notes:</strong> {notes}
                        </div>
                    )}
                    <div style={{ fontWeight: 'bold', marginTop: "5px", color: '#b85c38' }}>*Taxes applied to card and tap payments only</div>
                    <p style={{ marginTop: '20px', fontSize: '1.4rem', fontWeight: 'bold', color: '#b85c38' }}>
                        Please pay at the counter to enter the order preparation line.
                    </p>
                    <div className="anotherorder-button-container" style={{ marginTop: '20px', marginBottom: '20px' }}>
                        <button
                            onClick={() => {
                                setStep(1);
                                setSelectedItems({});
                                setCustomerName('');
                                setNotes(''); // Add this line
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

            {/* Modal */}
            {modalItem && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#fff',
                        padding: 20,
                        borderRadius: 8,
                        width: '90%',
                        maxWidth: 400,
                        textAlign: 'center'
                    }}>
                        <h2>{modalItem.name} Options</h2>
                        {modalItem.options?.map(option => (
                            <div key={option} style={{ marginBottom: 10 }}>
                                <label style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <input
                                        type={['Mild', 'Medium', 'Spicy', 'Extra Spicy'].includes(option) ? 'radio' : 'checkbox'}
                                        name={['Mild', 'Medium', 'Spicy', 'Extra Spicy'].includes(option) ? 'spice-level' : option}
                                        checked={itemOptions[modalItem.name]?.includes(option) || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setItemOptions(prev => {
                                                const currentOptions = prev[modalItem.name] || [];
                                                if (checked) {
                                                    if (['Mild', 'Medium', 'Spicy', 'Extra Spicy'].includes(option)) {
                                                        // Replace any existing spice level with the new one
                                                        const filteredOptions = currentOptions.filter(opt => !['Mild', 'Medium', 'Spicy', 'Extra Spicy'].includes(opt));
                                                        return { ...prev, [modalItem.name]: [...filteredOptions, option] };
                                                    } else {
                                                        return { ...prev, [modalItem.name]: [...currentOptions, option] };
                                                    }
                                                } else {
                                                    return { ...prev, [modalItem.name]: currentOptions.filter(opt => opt !== option) };
                                                }
                                            });
                                        }}
                                        style={{
                                            width: 18,
                                            height: 18,
                                            accentColor: '#b85c38'
                                        }}
                                    />
                                    {option}
                                </label>
                            </div>
                        ))}
                        <button onClick={closeModal} style={{ marginTop: 10, padding: '10px 20px', background: 'firebrick', color: '#fff', border: 'none', borderRadius: 6, marginRight: '10px' }}>Cancel</button>
                        <button onClick={handleOptionSubmit} style={{ marginTop: 20, padding: '10px 20px', background: 'green', color: '#fff', border: 'none', borderRadius: 6 }}>Add to Order</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KioskForm;
