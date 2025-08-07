import React, { useState } from 'react';
import axios from 'axios';
import './styles/KioskForm.css';

const KioskForm = () => {
    const [customerName, setCustomerName] = useState('');
    const [selectedItems, setSelectedItems] = useState({});
    const [step, setStep] = useState(1);
    const [orderNumber, setOrderNumber] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalItem, setModalItem] = useState(null);
    const [itemOptions, setItemOptions] = useState({});
    const [notes, setNotes] = useState('');

    const menuItems = [
        { id: 1, name: 'Mango Lassi', price: 3, image: '/images/mango-lassi.jpg', options: ['Ice', 'No Ice'] },
        { id: 2, name: 'Panipuri', price: 3, image: '/images/panipuri.JPG', options: ['No Spice', 'Mild', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro'] },
        { id: 3, name: 'Masala Puri', price: 4, image: '/images/masala-puri.JPG', options: ['No Spice', 'Mild', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro'] },
        { id: 4, name: 'Dahipuri', price: 6, image: '/images/dahipuri.JPG', options: ['No Spice', 'Mild', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro'] },
        { id: 5, name: 'Sevpuri', price: 6, image: '/images/sevpuri.JPG', options: ['No Spice', 'Mild', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro'] },
        { id: 6, name: 'Bhelpuri', price: 7, image: '/images/bhelpuri.JPG', options: ['No Spice', 'Mild', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro'] },
        { 
            id: 7, 
            name: 'Paneer Wrap', 
            price: 8, 
            image: '/images/paneer-wrap.JPG', 
            options: ['No Spice', 'Mild', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro', 'Extra Paneer (+$2)'],
            extraOptions: { 'Extra Paneer (+$2)': 2 }
        },
        { 
            id: 8, 
            name: 'Chicken Wrap', 
            price: 9, 
            image: '/images/chicken-wrap.JPG', 
            options: ['No Spice', 'Mild', 'Spicy', 'Extra Spicy', 'No Onions', 'No Cilantro', 'Extra Meat (+$2)'],
            extraOptions: { 'Extra Meat (+$2)': 2 }
        },
    ];

    // Helper function to calculate item price with extras
    const calculateItemPrice = (itemName, options) => {
        const baseItem = menuItems.find(i => i.name === itemName);
        if (!baseItem) return 0;
        
        let totalPrice = baseItem.price;
        
        // Add extra charges
        if (baseItem.extraOptions) {
            options.forEach(option => {
                if (baseItem.extraOptions[option]) {
                    totalPrice += baseItem.extraOptions[option];
                }
            });
        }
        
        return totalPrice;
    };

    const handleQuantityChange = (itemName, quantity, options = []) => {
        setSelectedItems(prev => {
            const updated = { ...prev };
            const key = `${itemName}-${options.join('-')}`;
            const currentQuantity = updated[key]?.quantity || 0;
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
        
        // Set default spice level for items that have spice options in order to avoid empty options
        if (item.options?.some(opt => ['No Spice', 'Mild', 'Spicy', 'Extra Spicy'].includes(opt))) {
            const currentOptions = itemOptions[item.name] || [];
            const hasSpiceLevel = currentOptions.some(opt => ['No Spice', 'Mild', 'Spicy', 'Extra Spicy'].includes(opt));
            
            if (!hasSpiceLevel) {
                setItemOptions(prev => ({
                    ...prev,
                    [item.name]: [...currentOptions, 'Mild'] // Default to 'Mild'
                }));
            }
        }
        
        // Set default "Ice" option for Mango Lassi
        if (item.name === 'Mango Lassi') {
            const currentOptions = itemOptions[item.name] || [];
            const hasIceOption = currentOptions.some(opt => ['Ice', 'No Ice'].includes(opt));
            
            if (!hasIceOption) {
                setItemOptions(prev => ({
                    ...prev,
                    [item.name]: [...currentOptions, 'Ice'] // Default to 'Ice'
                }));
            }
        }
    };

    const closeModal = () => {
        setModalItem(null);
    };

    const handleOptionSubmit = () => {
        const options = itemOptions[modalItem.name] || [];
        const key = `${modalItem.name}-${options.join('-')}`;
        const currentQuantity = selectedItems[key]?.quantity || 0;
        handleQuantityChange(modalItem.name, currentQuantity + 1, options);
        setItemOptions(prev => ({ ...prev, [modalItem.name]: [] }));
        closeModal();
    };

    const handleMenuSubmit = (e) => {
        e.preventDefault();

        const items = Object.entries(selectedItems)
            .flatMap(([name, { quantity }]) => {
                const validQuantity = Number(quantity) || 0;
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
        if (isSubmitting) return;

        setIsSubmitting(true);

        const items = Object.entries(selectedItems)
            .flatMap(([name, { quantity }]) => {
                const validQuantity = Number(quantity) || 0;
                return Array(validQuantity).fill(name);
            });

        // Calculate total
        const total = Object.entries(selectedItems)
            .reduce((sum, [key, { name, quantity, options }]) => {
                const itemPrice = calculateItemPrice(name, options);
                return sum + (itemPrice * quantity);
            }, 0);

        if (customerName.trim() && items.length > 0) {
            const order = {
                customerName,
                items,
                total,
                notes: notes.trim(),
                status: 'Pending',
            };
            try {
                const response = await axios.post('/api/orders', order);
                const fullOrderId = response.data._id;
                setOrderNumber(fullOrderId.slice(-4));
                setStep(3);
            } catch (error) {
                console.error('Error placing order:', error);
                alert('There was an error placing your order. Please try again.');
            } finally {
                setIsSubmitting(false);
            }
        } else {
            alert('Please enter your name and select at least one item.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="kiosk-container">
            {step === 1 && (
                <form onSubmit={handleMenuSubmit}>
                    <h1>Select Menu Items</h1>
                    <div className="menu-grid">
                        {menuItems.map(item => (
                            <div key={item.id} className="menu-item-card">
                                <img className='menu-item-image'
                                    src={item.image}
                                    alt={item.name}
                                />
                                <div className="menu-item-content">
                                    <hr />
                                    <label htmlFor={`qty-${item.name}`} className="menu-item-label">
                                        {item.name} | ${item.price}
                                    </label>
                                    <div className="quantity-controls">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const totalQuantity = Object.entries(selectedItems)
                                                    .filter(([key]) => key.startsWith(`${item.name}-`))
                                                    .reduce((sum, [, itemData]) => sum + itemData.quantity, 0);
                                                
                                                if (totalQuantity > 0) {
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
                                            className="quantity-btn quantity-btn-minus"
                                        >-</button>
                                        <span className="quantity-display">
                                            {Object.entries(selectedItems)
                                                .filter(([key]) => key.startsWith(`${item.name}-`))
                                                .reduce((sum, [, itemData]) => sum + itemData.quantity, 0)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => openModal(item)}
                                            className="quantity-btn quantity-btn-plus"
                                        >+</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="next-button-container">
                        <button className="next-button" type="submit">Next</button>
                    </div>
                </form>
            )}
            {step === 2 && (
                <form onSubmit={handleNameSubmit}>
                    <div className="back-button-container">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="back-button"
                        >
                            Back
                        </button>
                    </div>
                    <div className="order-card">
                        <h3 className="order-title">Your Order</h3>
                        
                        <div className="order-items-container">
                            <ul className="order-items-list">
                                {Object.entries(selectedItems)
                                    .filter(([_, { quantity }]) => quantity > 0)
                                    .map(([key, { name, quantity, options }]) => (
                                        <li key={key} className="order-item">
                                            <div className="order-item-content">
                                                <div className="order-item-details">
                                                    <div className="order-item-info">
                                                        <span className="order-item-name">{name} {quantity > 1 && `x${quantity}`}</span>
                                                        {options.length > 0 && (
                                                            <span className="order-item-options">
                                                                Options: {options.map(option => {
                                                                    const baseItem = menuItems.find(i => i.name === name);
                                                                    const hasExtraCharge = baseItem?.extraOptions?.[option];
                                                                    return hasExtraCharge ? `${option}` : option;
                                                                }).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="order-item-price">
                                                        ${calculateItemPrice(name, options).toFixed(2)}
                                                        {quantity > 1 && ` each`}
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                        <div className="order-total">
                            Total: $
                            {Object.entries(selectedItems)
                                .reduce((sum, [key, { name, quantity, options }]) => {
                                    const itemPrice = calculateItemPrice(name, options);
                                    return sum + (itemPrice * quantity);
                                }, 0)
                            }
                        </div>
                        {notes && (
                            <div className="order-notes">
                                <strong>Notes:</strong> {notes}
                            </div>
                        )}
                        <div className="tax-notice">*Taxes applied to card and tap payments only</div>
                    </div>
                    <h2>Enter Your Name</h2>
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                        className="name-input"
                    />
                    <h2>Allergies /  Special Requests / Notes (Optional)</h2>
                    <textarea
                        placeholder="Enter any allergies, special requests or notes here..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="notes-textarea"
                    />
                    <div className="order-button-container">
                        <button
                            className="order-button"
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Placing Order...' : 'Place Order'}
                        </button>
                    </div>
                </form>
            )}
            {step === 3 && (
                <div className="confirmation-container">
                    <h1>Order Confirmation</h1>
                    <p className="confirmation-details">Order Number: {orderNumber}</p>
                    <p className="confirmation-name">Name: {customerName}</p>
                    <h3 className="confirmation-items-title">Items Ordered:</h3>
                    <div className="confirmation-items-container">
                        <ul className="confirmation-items-list">
                            {Object.entries(selectedItems)
                                .filter(([_, { quantity }]) => quantity > 0)
                                .map(([key, { name, quantity, options }]) => (
                                    <li key={key} className="confirmation-item">
                                        <div className="confirmation-item-content">
                                            <div className="confirmation-item-details">
                                                <div className="confirmation-item-info">
                                                    <span className="confirmation-item-name">{name} {quantity > 1 && `x${quantity}`}</span>
                                                    {options.length > 0 && (
                                                        <span className="confirmation-item-options">
                                                            Options: {options.join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="confirmation-item-price">
                                                    ${calculateItemPrice(name, options).toFixed(2)}
                                                    {quantity > 1 && ` each`}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                        </ul>
                    </div>
                    <div className="confirmation-total">
                        Total: $
                        {Object.entries(selectedItems).reduce((sum, [key, { name, quantity, options }]) => {
                            const itemPrice = calculateItemPrice(name, options);
                            return sum + (itemPrice * quantity);
                        }, 0)}
                    </div>
                    {notes && (
                        <div className="confirmation-notes">
                            <strong>Notes:</strong> {notes}
                        </div>
                    )}
                    <div className="confirmation-tax-notice">*Taxes applied to card and tap payments only</div>
                    <p className="confirmation-payment-notice">
                        Please pay at the counter to enter the order preparation line.
                    </p>
                    <div className="another-order-container">
                        <button
                            onClick={() => {
                                setStep(1);
                                setSelectedItems({});
                                setCustomerName('');
                                setNotes('');
                            }}
                            className="another-order-button"
                        >
                            Place Another Order
                        </button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {modalItem && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{modalItem.name} Options</h2>

                        {/* Slider for Spice Level */}
                        {modalItem.options?.some(opt => ['No Spice', 'Mild', 'Spicy', 'Extra Spicy'].includes(opt)) && (
                            <div className="spice-slider-container">
                                <label htmlFor="spice-slider" className="spice-slider-label">Spice Level:</label>
                                <input
                                    type="range"
                                    id="spice-slider"
                                    min={0}
                                    max={3}
                                    step={1}
                                    value={(() => {
                                        const spiceLevels = ['No Spice', 'Mild', 'Spicy', 'Extra Spicy'];
                                        const selected = itemOptions[modalItem.name]?.find(opt => spiceLevels.includes(opt));
                                        return selected ? spiceLevels.indexOf(selected) : 1;
                                    })()}
                                    onChange={(e) => {
                                        const newLevel = ['No Spice', 'Mild', 'Spicy', 'Extra Spicy'][parseInt(e.target.value)];
                                        setItemOptions(prev => ({
                                            ...prev,
                                            [modalItem.name]: [
                                                ...(prev[modalItem.name]?.filter(opt => !['No Spice', 'Mild', 'Spicy', 'Extra Spicy'].includes(opt)) || []),
                                                newLevel
                                            ]
                                        }));
                                    }}
                                    className="spice-slider"
                                />
                                <div className="spice-levels">
                                    <span title="No Spice">No Spice</span>
                                    <span title="Mild">Mild</span>
                                    <span title="Spicy">Spicy</span>
                                    <span title="Extra Spicy">Extra Spicy</span>
                                </div>
                            </div>
                        )}

                        {/* Other Options (checkboxes for most items, radio buttons for Mango Lassi) */}
                        {modalItem.options?.filter(opt => !['No Spice', 'Mild', 'Spicy', 'Extra Spicy'].includes(opt)).map(option => (
                            <div key={option} className="option-container">
                                <label className="option-label">
                                    <input
                                        type={modalItem.name === 'Mango Lassi' ? 'radio' : 'checkbox'}
                                        name={modalItem.name === 'Mango Lassi' ? 'mango-lassi-options' : option}
                                        checked={itemOptions[modalItem.name]?.includes(option) || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setItemOptions(prev => {
                                                const currentOptions = prev[modalItem.name] || [];
                                                
                                                if (modalItem.name === 'Mango Lassi') {
                                                    // For radio buttons, replace the current option
                                                    return { ...prev, [modalItem.name]: checked ? [option] : [] };
                                                } else {
                                                    // For checkboxes, add/remove from array
                                                    if (checked) {
                                                        return { ...prev, [modalItem.name]: [...currentOptions, option] };
                                                    } else {
                                                        return {
                                                            ...prev,
                                                            [modalItem.name]: currentOptions.filter(opt => opt !== option)
                                                        };
                                                    }
                                                }
                                            });
                                        }}
                                        className="option-checkbox"
                                    />
                                    {option}
                                </label>
                            </div>
                        ))}

                        {/* Buttons */}
                        <button onClick={closeModal} className="modal-cancel-button">
                            Cancel
                        </button>
                        <button onClick={handleOptionSubmit} className="modal-add-button">
                            Add to Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KioskForm;
