import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/QuickOrderForm.css';

const QuickOrderForm = ({ menuItems, onOrderCreated, showToast }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [notes, setNotes] = useState('');
    const [orderItems, setOrderItems] = useState({});
    const [itemPrices, setItemPrices] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [optionsModal, setOptionsModal] = useState(null);
    const [selectedOptions, setSelectedOptions] = useState({});
    const [tipAmount, setTipAmount] = useState(0);
    const [customTip, setCustomTip] = useState('');
    const [selectedTipType, setSelectedTipType] = useState('none');
    const [paymentStep, setPaymentStep] = useState(null); // null | 'stripe-summary' | 'stripe-link'
    const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState('');
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    const calculateTotal = () => {
        return Object.entries(orderItems).reduce((total, [itemKey, quantity]) => {
            return total + (itemPrices[itemKey] || 0) * quantity;
        }, 0);
    };

    const addItem = (itemName) => {
        const menuItem = menuItems.find(item => item.name === itemName);
        if (!menuItem) return;

        // If item has options and modal is not disabled, show options modal
        if (!menuItem.noModal && menuItem.options && menuItem.options.length > 0) {
            openOptionsModal(itemName, menuItem);
        } else {
            // Add item directly without options
            const itemKey = itemName;
            setOrderItems(prev => ({
                ...prev,
                [itemKey]: (prev[itemKey] || 0) + 1
            }));
            if (!itemPrices[itemKey]) {
                setItemPrices(prev => ({
                    ...prev,
                    [itemKey]: menuItem.price
                }));
            }
        }
    };

    const openOptionsModal = (itemName, menuItem) => {
        // Set default options
        let defaultOptions = [];
        
        // Set default spice level for items with spice options
        if (menuItem.options?.some(opt => ['Mild', 'Medium', 'Spicy'].includes(opt))) {
            defaultOptions.push('Medium');
        }
        
        // Set default "Cold" for Water
        if (menuItem.name === 'Water') {
            defaultOptions.push('Cold');
        }
        
        setSelectedOptions({ [itemName]: defaultOptions });
        setOptionsModal({ itemName, menuItem });
    };

    const closeOptionsModal = () => {
        setOptionsModal(null);
        setSelectedOptions({});
    };

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (optionsModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [optionsModal]);

    // Prevent body scroll when form is expanded
    useEffect(() => {
        if (isExpanded) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isExpanded]);

    const handleOptionSubmit = () => {
        const { itemName, menuItem } = optionsModal;
        const options = selectedOptions[itemName] || [];
        
        // Calculate price with options
        let itemPrice = menuItem.price;
        if (menuItem.extraOptions && options.length > 0) {
            options.forEach(option => {
                const baseOptionName = option.replace(/\s*\(\+\$\d+(\.\d+)?\)/, '');
                if (menuItem.extraOptions[baseOptionName]) {
                    itemPrice += menuItem.extraOptions[baseOptionName];
                }
            });
        }

        // Create item key with options
        const itemKey = options.length > 0 
            ? `${itemName} (${options.join(', ')})`
            : itemName;

        setOrderItems(prev => ({
            ...prev,
            [itemKey]: (prev[itemKey] || 0) + 1
        }));

        setItemPrices(prev => ({
            ...prev,
            [itemKey]: itemPrice
        }));

        closeOptionsModal();
    };

    const updateQuantity = (itemKey, change) => {
        setOrderItems(prev => {
            const newQuantity = Math.max(0, (prev[itemKey] || 0) + change);
            if (newQuantity === 0) {
                const updated = { ...prev };
                delete updated[itemKey];
                return updated;
            }
            return {
                ...prev,
                [itemKey]: newQuantity
            };
        });
    };

    const removeItem = (itemKey) => {
        setOrderItems(prev => {
            const updated = { ...prev };
            delete updated[itemKey];
            return updated;
        });
        setItemPrices(prev => {
            const updated = { ...prev };
            delete updated[itemKey];
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!customerName.trim()) {
            showToast('Please enter customer name', 'error');
            return;
        }

        if (Object.keys(orderItems).length === 0) {
            showToast('Please add at least one item', 'error');
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Create items array
            const items = [];
            Object.entries(orderItems).forEach(([itemKey, quantity]) => {
                for (let i = 0; i < quantity; i++) {
                    items.push(itemKey);
                }
            });

            const orderData = {
                customerName: customerName.trim(),
                customerEmail: customerEmail.trim() || '', // Optional email
                items,
                total: calculateTotal(),
                tip: tipAmount,
                notes: notes.trim(),
                paid: false, // Counter orders start as unpaid
                paymentId: null // No payment ID for counter orders
            };

            await axios.post('/api/orders', orderData);
            
            // Reset form
            setCustomerName('');
            setCustomerEmail('');
            setNotes('');
            setOrderItems({});
            setItemPrices({});
            setTipAmount(0);
            setCustomTip('');
            setSelectedTipType('none');
            setIsExpanded(false);
            
            showToast('Counter order created successfully!', 'success');
            if (onOrderCreated) onOrderCreated();
            
        } catch (error) {
            console.error('Error creating counter order:', error);
            showToast('Failed to create order. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setCustomerName('');
        setCustomerEmail('');
        setNotes('');
        setOrderItems({});
        setItemPrices({});
        setTipAmount(0);
        setCustomTip('');
        setSelectedTipType('none');
        setPaymentStep(null);
        setStripeCheckoutUrl('');
        setIsExpanded(false);
    };

    const handleCancel = () => resetForm();
    const closeAll = () => resetForm();

    const handleTipAmount = (amount) => {
        setTipAmount(amount);
        setCustomTip('');
        setSelectedTipType('fixed');
    };

    const handleCustomTipChange = (e) => {
        const value = e.target.value;
        setCustomTip(value);
        const tip = parseFloat(value) || 0;
        setTipAmount(tip);
        setSelectedTipType(tip > 0 ? 'custom' : 'none');
    };

    const handleCashOrder = async () => {
        if (!customerName.trim()) { showToast('Please enter customer name', 'error'); return; }
        if (Object.keys(orderItems).length === 0) { showToast('Please add at least one item', 'error'); return; }
        setIsSubmitting(true);
        try {
            const items = [];
            Object.entries(orderItems).forEach(([itemKey, quantity]) => {
                for (let i = 0; i < quantity; i++) items.push(itemKey);
            });
            await axios.post('/api/orders', {
                customerName: customerName.trim(),
                customerEmail: customerEmail.trim() || '',
                items,
                total: calculateTotal(),
                tip: tipAmount,
                notes: notes.trim(),
                paid: false,
                paymentId: null,
            });
            resetForm();
            showToast('Cash order created!', 'success');
            if (onOrderCreated) onOrderCreated();
        } catch (error) {
            console.error('Error creating cash order:', error);
            showToast('Failed to create order. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStripeClick = () => {
        if (!customerName.trim()) { showToast('Please enter customer name', 'error'); return; }
        if (Object.keys(orderItems).length === 0) { showToast('Please add at least one item', 'error'); return; }
        setPaymentStep('stripe-summary');
    };

    const handleConfirmStripe = async () => {
        setIsGeneratingLink(true);
        try {
            const items = [];
            Object.entries(orderItems).forEach(([itemKey, quantity]) => {
                for (let i = 0; i < quantity; i++) items.push(itemKey);
            });
            const sub = calculateTotal();
            const tax = sub * 0.0825;
            const fee = (sub + tax + tipAmount) * 0.029 + 0.30;
            const grandTotal = +(sub + tax + fee + tipAmount).toFixed(2);

            const orderRes = await axios.post('/api/orders', {
                customerName: customerName.trim(),
                customerEmail: customerEmail.trim() || '',
                items,
                total: grandTotal,
                tip: tipAmount,
                notes: notes.trim(),
                paid: false,
                paymentId: null,
            });
            const orderId = orderRes.data._id;

            const sessionRes = await axios.post('/api/payments/create-checkout-session', {
                amountInCents: Math.round(grandTotal * 100),
                customerName: customerName.trim(),
                customerEmail: customerEmail.trim() || '',
                orderId,
                description: Object.keys(orderItems).slice(0, 3).join(', '),
            });

            setStripeCheckoutUrl(sessionRes.data.url);
            setPaymentStep('stripe-link');
            if (onOrderCreated) onOrderCreated();
        } catch (error) {
            console.error('Error generating payment link:', error);
            showToast('Failed to generate payment link. Please try again.', 'error');
        } finally {
            setIsGeneratingLink(false);
        }
    };

    // Computed stripe totals (used in stripe-summary + stripe-link panels)
    const _sub = calculateTotal();
    const _tax = _sub * 0.0825;
    const _fee = (_sub + _tax + tipAmount) * 0.029 + 0.30;
    const _stripeTotal = _sub + _tax + _fee + tipAmount;

    return (
        <div className="qof-container">
            <button 
                className={`qof-toggle-btn ${isExpanded ? 'qof-expanded' : ''}`}
                onClick={() => setIsExpanded(!isExpanded)}
                title="Quick add order for counter customers"
            >
                <span className="qof-btn-icon">{isExpanded ? '−' : '+'}</span>
                <span className="qof-btn-text">Counter Order</span>
            </button>

            {isExpanded && (
                <>
                    <div 
                        className="qof-backdrop" 
                        onClick={closeAll}
                    />
                    <div className="qof-form-wrapper" onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={e => e.preventDefault()} className="qof-form" style={paymentStep !== null ? {display:'none'} : {}}>
                        <div className="qof-form-header">
                            <h3 className="qof-title">Quick Counter Order</h3>
                            <p className="qof-subtitle">For customers ordering at the counter</p>
                        </div>

                        <div className="qof-form-body">
                            <div className="qof-customer-row">
                                <div className="qof-customer-section">
                                    <label className="qof-label">Customer Name *</label>
                                    <input
                                        type="text"
                                        className="qof-input"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Enter customer name"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="qof-customer-section">
                                    <label className="qof-label">Customer Email (Optional)</label>
                                    <input
                                        type="email"
                                        className="qof-input"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        placeholder="Enter email (optional)"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className="qof-customer-section">
                                <label className="qof-label">Order Notes (Optional)</label>
                                <textarea
                                    className="qof-input qof-textarea"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add special instructions or notes"
                                    disabled={isSubmitting}
                                    rows="2"
                                />
                            </div>

                            <div className="qof-items-section">
                                <label className="qof-label">Add Items</label>
                                <div className="qof-menu-grid">
                                    {menuItems.map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className="qof-menu-item-btn"
                                            onClick={() => addItem(item.name)}
                                            disabled={isSubmitting}
                                        >
                                            <span className="qof-item-name">{item.name}</span>
                                            <span className="qof-item-price">${item.price}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {Object.keys(orderItems).length > 0 && (
                                <div className="qof-cart-section">
                                    <label className="qof-label">Order Summary</label>
                                    <div className="qof-cart-items">
                                        {Object.entries(orderItems).map(([itemKey, quantity]) => (
                                            <div key={itemKey} className="qof-cart-item">
                                                <div className="qof-cart-item-info">
                                                    <span className="qof-cart-item-name">{itemKey}</span>
                                                    <span className="qof-cart-item-price">
                                                        ${((itemPrices[itemKey] || 0) * quantity).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="qof-cart-item-controls">
                                                    <button
                                                        type="button"
                                                        className="qof-qty-btn"
                                                        onClick={() => updateQuantity(itemKey, -1)}
                                                        disabled={isSubmitting}
                                                    >
                                                        −
                                                    </button>
                                                    <span className="qof-qty-display">{quantity}</span>
                                                    <button
                                                        type="button"
                                                        className="qof-qty-btn"
                                                        onClick={() => updateQuantity(itemKey, 1)}
                                                        disabled={isSubmitting}
                                                    >
                                                        +
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="qof-remove-btn"
                                                        onClick={() => removeItem(itemKey)}
                                                        disabled={isSubmitting}
                                                        title="Remove item"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="qof-cart-total">
                                        <div className="qof-total-row">
                                            <span className="qof-total-label">Subtotal:</span>
                                            <span className="qof-total-amount">${calculateTotal().toFixed(2)}</span>
                                        </div>
                                        {tipAmount > 0 && (
                                            <div className="qof-total-row qof-tip-row">
                                                <span className="qof-total-label">Tip:</span>
                                                <span className="qof-total-amount">${tipAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="qof-total-row qof-grand-total">
                                            <span className="qof-total-label">Total:</span>
                                            <span className="qof-total-amount">${(calculateTotal() + tipAmount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="qof-tip-section">
                                <label className="qof-label">Tip (Optional)</label>
                                <div className="qof-tip-buttons">
                                    <button
                                        type="button"
                                        className={`qof-tip-btn ${selectedTipType === 'fixed' && tipAmount === 1 ? 'selected' : ''}`}
                                        onClick={() => handleTipAmount(1)}
                                        disabled={isSubmitting}
                                    >
                                        $1
                                    </button>
                                    <button
                                        type="button"
                                        className={`qof-tip-btn ${selectedTipType === 'fixed' && tipAmount === 2 ? 'selected' : ''}`}
                                        onClick={() => handleTipAmount(2)}
                                        disabled={isSubmitting}
                                    >
                                        $2
                                    </button>
                                    <button
                                        type="button"
                                        className={`qof-tip-btn ${selectedTipType === 'fixed' && tipAmount === 3 ? 'selected' : ''}`}
                                        onClick={() => handleTipAmount(3)}
                                        disabled={isSubmitting}
                                    >
                                        $3
                                    </button>
                                    <button
                                        type="button"
                                        className={`qof-tip-btn ${selectedTipType === 'none' && tipAmount === 0 ? 'selected' : ''}`}
                                        onClick={() => {
                                            setTipAmount(0);
                                            setCustomTip('');
                                            setSelectedTipType('none');
                                        }}
                                        disabled={isSubmitting}
                                    >
                                        No Tip
                                    </button>
                                    <input
                                        type="number"
                                        className="qof-custom-tip-input"
                                        value={customTip}
                                        onChange={handleCustomTipChange}
                                        placeholder="Custom $"
                                        min="0"
                                        step="0.01"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="qof-form-actions">
                            <button
                                type="button"
                                className="qof-cash-btn"
                                onClick={handleCashOrder}
                                disabled={isSubmitting || !customerName.trim() || Object.keys(orderItems).length === 0}
                            >
                                {isSubmitting ? 'Processing...' : '💵 Cash Order'}
                            </button>
                            <button
                                type="button"
                                className="qof-stripe-pay-btn"
                                onClick={handleStripeClick}
                                disabled={isSubmitting || !customerName.trim() || Object.keys(orderItems).length === 0}
                            >
                                💳 Stripe Payment
                            </button>
                            <button
                                type="button"
                                className="qof-cancel-btn"
                                onClick={handleCancel}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>

                    {/* Stripe Summary Panel */}
                    {paymentStep === 'stripe-summary' && (
                        <div className="qof-stripe-overlay">
                            <div className="qof-form-header">
                                <h3 className="qof-title">💳 Stripe Payment</h3>
                                <p className="qof-subtitle">Total includes tax &amp; convenience fee</p>
                            </div>
                            <div className="qof-stripe-breakdown">
                                <div className="qof-breakdown-row">
                                    <span>Subtotal</span>
                                    <span>${_sub.toFixed(2)}</span>
                                </div>
                                <div className="qof-breakdown-row">
                                    <span>Tax (8.25%)</span>
                                    <span>${_tax.toFixed(2)}</span>
                                </div>
                                <div className="qof-breakdown-row">
                                    <span>Convenience Fee</span>
                                    <span>${_fee.toFixed(2)}</span>
                                </div>
                                {tipAmount > 0 && (
                                    <div className="qof-breakdown-row">
                                        <span>Tip</span>
                                        <span>${tipAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="qof-breakdown-row qof-breakdown-total">
                                    <span>Total</span>
                                    <span>${_stripeTotal.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="qof-form-actions">
                                <button
                                    type="button"
                                    className="qof-stripe-pay-btn"
                                    onClick={handleConfirmStripe}
                                    disabled={isGeneratingLink}
                                >
                                    {isGeneratingLink ? 'Processing...' : '✓ Place Order & Get Payment Link'}
                                </button>
                                <button
                                    type="button"
                                    className="qof-cancel-btn"
                                    onClick={() => setPaymentStep(null)}
                                >
                                    ← Back
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stripe Link Panel */}
                    {paymentStep === 'stripe-link' && (
                        <div className="qof-stripe-overlay">
                            <div className="qof-form-header">
                                <h3 className="qof-title">Payment Link Ready</h3>
                                <p className="qof-subtitle">Show QR code or send link to customer</p>
                            </div>
                            <div className="qof-link-body">
                                <div className="qof-amount-display">
                                    <span className="qof-amount-label">Total Due</span>
                                    <span className="qof-amount-value">${_stripeTotal.toFixed(2)}</span>
                                </div>
                                <div className="qof-qr-container">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(stripeCheckoutUrl)}`}
                                        alt="Payment QR Code"
                                        className="qof-qr-code"
                                    />
                                    <p className="qof-qr-caption">Customer scans to pay</p>
                                </div>
                                <button
                                    type="button"
                                    className="qof-open-link-btn"
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: 'Chaat Mahal Payment',
                                                text: `Pay $${_stripeTotal.toFixed(2)} for your Chaat Mahal order`,
                                                url: stripeCheckoutUrl,
                                            }).catch(() => {});
                                        } else {
                                            window.open(stripeCheckoutUrl, '_blank');
                                        }
                                    }}
                                >
                                    📱 Share Payment Link
                                </button>
                            </div>
                            <div className="qof-form-actions">
                                <button
                                    type="button"
                                    className="qof-submit-btn"
                                    onClick={resetForm}
                                >
                                    ✓ Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                </>
            )}

            {/* Options Modal */}
            {optionsModal && (
                <div className="qof-modal-overlay">
                    <div className="qof-modal">
                        <div className="qof-modal-header">
                            <h3 className="qof-modal-title">Select Options for {optionsModal.itemName}</h3>
                            <button 
                                className="qof-modal-close" 
                                onClick={closeOptionsModal}
                                type="button"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="qof-modal-content">
                            {/* Spice Level Slider */}
                            {optionsModal.menuItem.options?.some(opt => ['Mild', 'Medium', 'Spicy'].includes(opt)) && (
                                <div className="qof-spice-section">
                                    <label className="qof-modal-label">Spice Level:</label>
                                    <div className="qof-spice-selector">
                                        <input
                                            type="range"
                                            min="0"
                                            max="2"
                                            value={(() => {
                                                const currentOptions = selectedOptions[optionsModal.itemName] || [];
                                                const spiceLevels = ['Mild', 'Medium', 'Spicy'];
                                                const currentSpice = currentOptions.find(opt => spiceLevels.includes(opt));
                                                return spiceLevels.indexOf(currentSpice) !== -1 ? spiceLevels.indexOf(currentSpice) : 1;
                                            })()}
                                            onChange={(e) => {
                                                const spiceLevels = ['Mild', 'Medium', 'Spicy'];
                                                const newLevel = spiceLevels[parseInt(e.target.value)];
                                                setSelectedOptions(prev => ({
                                                    ...prev,
                                                    [optionsModal.itemName]: [
                                                        ...(prev[optionsModal.itemName]?.filter(opt => !spiceLevels.includes(opt)) || []),
                                                        newLevel
                                                    ]
                                                }));
                                            }}
                                            className="qof-spice-slider"
                                        />
                                        <div className="qof-spice-levels">
                                            <span>Mild</span>
                                            <span>Medium</span>
                                            <span>Spicy</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Other Options */}
                            {optionsModal.menuItem.options?.filter(opt => !['Mild', 'Medium', 'Spicy'].includes(opt)).map(option => (
                                <div key={option} className="qof-option-container">
                                    <label className="qof-option-label">
                                        <input
                                            type={optionsModal.menuItem.name === 'Water' ? 'radio' : 'checkbox'}
                                            name={optionsModal.menuItem.name === 'Water' ? 'water-options' : option}
                                            checked={selectedOptions[optionsModal.itemName]?.includes(option) || false}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setSelectedOptions(prev => {
                                                    const currentOptions = prev[optionsModal.itemName] || [];
                                                    
                                                    if (optionsModal.menuItem.name === 'Water') {
                                                        return { ...prev, [optionsModal.itemName]: checked ? [option] : [] };
                                                    } else {
                                                        if (checked) {
                                                            return { ...prev, [optionsModal.itemName]: [...currentOptions, option] };
                                                        } else {
                                                            return {
                                                                ...prev,
                                                                [optionsModal.itemName]: currentOptions.filter(opt => opt !== option)
                                                            };
                                                        }
                                                    }
                                                });
                                            }}
                                        />
                                        <span className="qof-option-text">{option}</span>
                                    </label>
                                </div>
                            ))}
                        </div>

                        <div className="qof-modal-actions">
                            <button 
                                className="qof-modal-confirm"
                                onClick={handleOptionSubmit}
                                type="button"
                            >
                                Add Item
                            </button>
                            <button 
                                className="qof-modal-cancel"
                                onClick={closeOptionsModal}
                                type="button"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickOrderForm;
