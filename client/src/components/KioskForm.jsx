import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PaymentForm from './PaymentForm';
import Toast from './Toast';
import '../styles/KioskForm.css';

const KioskForm = ({ initialStep = 1 }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [isLoadingMenu, setIsLoadingMenu] = useState(true);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [selectedItems, setSelectedItems] = useState({});
    const [step, setStep] = useState(initialStep);
    const [orderNumber, setOrderNumber] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalItem, setModalItem] = useState(null);
    const [itemOptions, setItemOptions] = useState({});
    const [notes, setNotes] = useState('');
    const [showCartSummary, setShowCartSummary] = useState(false);
    const [cartTotal, setCartTotal] = useState(0);
    const [paymentId, setPaymentId] = useState(null);
    const [settings, setSettings] = useState({ onlinePaymentEnabled: true, payAtCounterEnabled: true });
    const [tipAmount, setTipAmount] = useState(0);
    
    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 3000);
    };
    
    // Get ordered categories from settings, filter to only show categories with active items
    const getCategoriesWithItems = () => {
        if (!settings.categories || settings.categories.length === 0) {
            // Fallback: extract from menu items if settings don't have categories
            return [...new Set(menuItems.filter(item => item.active !== false).map(item => item.category))];
        }
        // Filter settings categories to only include those with active items
        const itemCategories = new Set(menuItems.filter(item => item.active !== false).map(item => item.category));
        return settings.categories.filter(cat => itemCategories.has(cat));
    };
    
    const categories = getCategoriesWithItems();
    
    // State for floating index
    const [activeSection, setActiveSection] = useState(categories.length > 0 ? categories[0] : 'Chaat');

    // Fetch settings on component mount
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axios.get('/api/settings', { timeout: 8000 });
            setSettings(response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            // Fallback to default settings if fetch fails
            setSettings({ onlinePaymentEnabled: true, payAtCounterEnabled: true });
        }
    };

    // Fetch menu items from API
    useEffect(() => {
        const fetchMenuItems = async () => {
            try {
                // 8s timeout — if the server hangs (e.g. DB not connected yet), fail fast
                // and show the fallback menu rather than spinning forever
                const response = await axios.get('/api/menu', { timeout: 8000 });
                setMenuItems(response.data);
            } catch (error) {
                console.error('Error fetching menu items:', error);
                // Fallback to hardcoded menu if API fails
                setMenuItems([
                    { 
                        id: 1, 
                        name: 'Samosa', 
                        price: 2, 
                        image: '/images/default-food.jpg', // Use default image for fallback
                        options: [], 
                        category: 'Chaat', 
                        description: 'Crispy pastry filled with spiced potatoes and peas' 
                    },
                    { 
                        id: 2, 
                        name: 'Panipuri', 
                        price: 3, 
                        image: '/images/panipuri.JPG', // Keep existing images where available
                        options: ['Mild', 'Medium', 'Spicy', 'No Onions', 'No Cilantro'], 
                        category: 'Chaat', 
                        description: 'Crispy shells filled with spiced water and chutneys' 
                    },
                    { id: 3, name: 'Masala Puri', price: 4, image: '/images/masala-puri.JPG', options: ['Mild', 'Medium', 'Spicy', 'No Onions', 'No Cilantro'], category: 'Chaat', description: 'Crispy puris topped with spiced potatoes and chutneys' },
                    { id: 4, name: 'Dahipuri', price: 6, image: '/images/dahipuri.JPG', options: ['Mild', 'Medium', 'Spicy', 'No Onions', 'No Cilantro'], category: 'Chaat', description: 'Puris filled with yogurt, chutneys and spices' },
                    { id: 5, name: 'Sevpuri', price: 6, image: '/images/sevpuri.JPG', options: ['Mild', 'Medium', 'Spicy', 'No Onions', 'No Cilantro'], category: 'Chaat', description: 'Crispy puris topped with sev, vegetables and chutneys' },
                    { id: 6, name: 'Bhelpuri', price: 7, image: '/images/bhelpuri.JPG', options: ['Mild', 'Medium', 'Spicy', 'No Onions', 'No Cilantro'], category: 'Chaat', description: 'Popular street snack with puffed rice and chutneys' },
                    { id: 7, name: 'Water', price: 1, image: '/images/water.JPG', options: ['Cold', 'Room Temperature'], category: 'Drinks', description: 'Refreshing drinking water' },
                    { 
                        id: 8, 
                        name: 'Paneer Wrap', 
                        price: 8, 
                        image: '/images/paneer-wrap.JPG', 
                        options: ['Mild', 'Medium', 'Spicy', 'No Onions', 'No Cilantro', 'Extra Paneer (+$2)'],
                        extraOptions: { 'Extra Paneer': 2 },
                        category: 'Wraps',
                        description: 'Grilled paneer with fresh vegetables wrapped in naan'
                    },
                    { 
                        id: 9, 
                        name: 'Chicken Wrap', 
                        price: 9, 
                        image: '/images/chicken-wrap.JPG', 
                        options: ['Mild', 'Medium', 'Spicy', 'No Onions', 'No Cilantro', 'Extra Meat (+$2)'],
                        extraOptions: { 'Extra Meat': 2 },
                        category: 'Wraps',
                        description: 'Tender spiced chicken with vegetables wrapped in naan'
                    },
                ]);
            } finally {
                setIsLoadingMenu(false);
            }
        };

        fetchMenuItems();
    }, []);

    // Scroll tracking for floating index
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + 200; // Offset for navbar
            
            for (let i = categories.length - 1; i >= 0; i--) {
                const section = document.getElementById(`section-${categories[i]}`);
                if (section && section.offsetTop <= scrollPosition) {
                    setActiveSection(categories[i]);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Check initial position

        return () => window.removeEventListener('scroll', handleScroll);
    }, [categories]);

    // Prevent body scroll when modal or cart summary is open
    useEffect(() => {
        if (modalItem || showCartSummary) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [modalItem, showCartSummary]);

    // Function to scroll to section
    const scrollToSection = (section) => {
        const element = document.getElementById(`section-${section}`);
        if (element) {
            const yOffset = -100; // Offset for fixed navbar
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    // Calculate cart total whenever selectedItems changes
    useEffect(() => {
        const total = Object.entries(selectedItems)
            .reduce((sum, [key, { name, quantity, options }]) => {
                const itemPrice = calculateItemPrice(name, options);
                return sum + (itemPrice * quantity);
            }, 0);
        setCartTotal(total);
    }, [selectedItems]);

    const calculateItemPrice = (itemName, options) => {
        const item = menuItems.find(item => item.name === itemName);
        let price = item.price;
        
        if (item.extraOptions && options) {
            options.forEach(option => {
                // Check if the option exists directly in extraOptions
                if (item.extraOptions[option]) {
                    price += item.extraOptions[option];
                } else {
                    // Handle options with (+$X) format - extract the base name
                    const baseOptionName = option.replace(/\s*\(\+\$\d+(\.\d+)?\)/, '');
                    if (item.extraOptions[baseOptionName]) {
                        price += item.extraOptions[baseOptionName];
                    }
                }
            });
        }
        
        return price;
    };

    const getTotalItemsInCart = () => {
        return Object.values(selectedItems).reduce((total, item) => total + item.quantity, 0);
    };

    const addToCart = (itemName, quantity, options) => {
        // Ensure options is always an array and sort consistently
        const normalizedOptions = Array.isArray(options) ? [...options].sort() : [];
        const key = `${itemName}-${normalizedOptions.join('|')}`;
        
        console.log('Adding to cart:', { itemName, quantity, options: normalizedOptions, key });
        
        setSelectedItems(prev => {
            const updated = { ...prev };
            
            if (updated[key]) {
                // Item already exists, increase quantity
                updated[key] = {
                    ...updated[key],
                    quantity: updated[key].quantity + quantity
                };
                console.log('Updated existing item:', updated[key]);
            } else {
                // New item
                updated[key] = { 
                    name: itemName, 
                    quantity, 
                    options: normalizedOptions 
                };
                console.log('Created new item:', updated[key]);
            }
            
            return updated;
        });
    };

    const openModal = (item) => {
        setModalItem(item);
        
        // Initialize with default Medium spice for items with spice option
        const hasSpice = item.options && item.options.some(opt => 
            ['Mild', 'Medium', 'Spicy'].includes(opt)
        );
        
        setItemOptions({
            spiceLevel: hasSpice ? 'Medium' : null,
            otherOptions: [],
            extraOptions: []
        });
    };

    const closeModal = () => {
        setModalItem(null);
        setItemOptions({
            spiceLevel: null,
            otherOptions: [],
            extraOptions: []
        });
    };

    const handleSpiceChange = (level) => {
        setItemOptions(prev => ({
            ...prev,
            spiceLevel: level
        }));
    };

    const handleOtherOptionToggle = (option) => {
        setItemOptions(prev => {
            const isSelected = prev.otherOptions.includes(option);
            return {
                ...prev,
                otherOptions: isSelected 
                    ? prev.otherOptions.filter(o => o !== option)
                    : [...prev.otherOptions, option]
            };
        });
    };

    const handleExtraOptionToggle = (optionName) => {
        setItemOptions(prev => {
            const isSelected = prev.extraOptions.includes(optionName);
            return {
                ...prev,
                extraOptions: isSelected
                    ? prev.extraOptions.filter(o => o !== optionName)
                    : [...prev.extraOptions, optionName]
            };
        });
    };

    const handleOptionSubmit = () => {
        if (!modalItem) return;
        
        // Combine all selected options
        const allOptions = [];
        
        // Add spice level if selected
        if (itemOptions.spiceLevel) {
            allOptions.push(itemOptions.spiceLevel);
        }
        
        // Add other options
        allOptions.push(...itemOptions.otherOptions);
        
        // Add extra options
        allOptions.push(...itemOptions.extraOptions);
        
        // Add to cart with all options
        addToCart(modalItem.name, 1, allOptions);
        closeModal();
    };

    const updateCartQuantity = (key, change) => {
        setSelectedItems(prev => {
            const updated = { ...prev };
            
            if (updated[key]) {
                const newQuantity = updated[key].quantity + change;
                
                if (newQuantity <= 0) {
                    // Remove item if quantity becomes 0 or negative
                    delete updated[key];
                } else {
                    updated[key] = {
                        ...updated[key],
                        quantity: newQuantity
                    };
                }
            }
            
            return updated;
        });
    };

    const proceedToCheckout = () => {
        if (Object.keys(selectedItems).length === 0) {
            showToast('Please select at least one item.', 'warning');
            return;
        }
        setStep(2);
        // Scroll to top when moving to checkout
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleMenuSubmit = (e) => {
        e.preventDefault();
        proceedToCheckout();
    };

    const handleNameSubmit = async (e) => {
        e.preventDefault();
        
        // Only require name and at least one item - email is optional
        if (customerName && Object.keys(selectedItems).length > 0) {
            // Check if online payments are enabled
            if (settings.onlinePaymentEnabled) {
                // Move to payment step
                setStep(3); 
            } else {
                // Skip payment step and go directly to counter payment
                handlePayAtCounter();
            }
        } else {
            showToast('Please enter your name and select at least one item.', 'warning');
        }
    };

    const handlePayAtCounter = async (tip = 0) => {
        if (isSubmitting) return; // Prevent multiple submissions
        
        setIsSubmitting(true);
        setTipAmount(tip); // Set the tip amount from PaymentForm
        
        const subtotal = Object.entries(selectedItems).reduce((sum, [key, { name, quantity, options }]) => {
            const itemPrice = calculateItemPrice(name, options);
            return sum + (itemPrice * quantity);
        }, 0);

        // For counter payments, send subtotal + tip (no tax or convenience fee)
        const orderData = {
            customerName,
            customerEmail,
            items: Object.values(selectedItems).flatMap(item => 
                Array(item.quantity).fill(item.options.length > 0 ? `${item.name} (${item.options.join(', ')})` : item.name)
            ),
            total: subtotal,  // store subtotal only; tip stored separately
            tip: tip,
            notes: notes || '',
            paymentId: null,
            paid: false
        };

        try {
            const response = await axios.post('/api/orders', orderData);
            setOrderNumber(response.data.orderNumber);
            setStep(4);
        } catch (error) {
            console.error('Error submitting order:', error);
            showToast('There was an error submitting your order. Please try again.', 'error');
            setIsSubmitting(false);
        }
        // Note: Don't reset isSubmitting on success since the component will move to step 4
    };

    const handlePaymentSuccess = async (paymentId, tip = 0) => {
        setPaymentId(paymentId);
        setTipAmount(tip);
        setIsSubmitting(true);
        
        const subtotal = Object.entries(selectedItems).reduce((sum, [key, { name, quantity, options }]) => {
            const itemPrice = calculateItemPrice(name, options);
            return sum + (itemPrice * quantity);
        }, 0);

        const taxAmount = subtotal * 0.0825;
        const convenienceFee = (subtotal + taxAmount + tip) * 0.029 + 0.30;
        const totalWithTax = +(subtotal + taxAmount + convenienceFee + tip).toFixed(2);

        // For online payments, send total without tip (tip stored separately; OrderList adds them for display)
        const orderData = {
            customerName,
            customerEmail,
            items: Object.values(selectedItems).flatMap(item => 
                Array(item.quantity).fill(item.options.length > 0 ? `${item.name} (${item.options.join(', ')})` : item.name)
            ),
            total: +subtotal.toFixed(2),  // raw subtotal only, consistent with counter orders
            tip: tip,
            taxAmount: +taxAmount.toFixed(2),
            convenienceFee: +convenienceFee.toFixed(2),
            stripeTotal: totalWithTax,  // full amount actually charged (subtotal + tax + fee + tip)
            notes: notes || '',
            paymentId: paymentId,
            paid: true
        };

        console.log('Submitting order with payment data:', orderData);

        try {
            const response = await axios.post('/api/orders', orderData);
            console.log('Order creation response:', response.data);
            setOrderNumber(response.data.orderNumber);
            setStep(4);
        } catch (error) {
            console.error('Error submitting order:', error);
            showToast('Payment successful, but there was an error submitting your order. Please contact us with payment ID: ' + paymentId, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaymentCancel = () => {
        setStep(2); // Go back to order review
    };

    // Scroll to top when step changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    if (isLoadingMenu) {
        return (
            <div className="kiosk-loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading menu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="kiosk-container">
            {step === 1 && (
                <form onSubmit={handleMenuSubmit}>
                    <div className="menu-header">
                        <h1>Our Menu</h1>
                        <p className="menu-subtitle">Authentic Indian Street Food Made Fresh</p>
                    </div>

                    {/* Floating Index */}
                    <div className="floating-index">
                        {categories.map(section => (
                            <button
                                key={section}
                                type="button"
                                className={`index-item ${activeSection === section ? 'active' : ''}`}
                                onClick={() => scrollToSection(section)}
                            >
                                <span className="index-text">{section}</span>
                                <span className="index-count">
                                    {menuItems.filter(item => item.category === section && item.active !== false).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Floating Cart Summary with Updated Checkout Function */}
                    {getTotalItemsInCart() > 0 && (
                        <div 
                            className={`floating-cart ${showCartSummary ? 'hidden' : ''}`} 
                            onClick={() => setShowCartSummary(true)}
                        >
                            <div className="cart-icon">🛒</div>
                            <div className="cart-info">
                                <span className="cart-count">{getTotalItemsInCart()}</span>
                                <span className="view-cart-text">View Cart</span>
                            </div>
                        </div>
                    )}

                    {/* Enhanced Cart Summary with Quantity Controls */}
                    {showCartSummary && getTotalItemsInCart() > 0 && (
                        <div className="cart-summary">
                            <div className="cart-summary-header">
                                <h3>Your Order</h3>
                                <button 
                                    className="cart-close-btn"
                                    onClick={() => setShowCartSummary(false)}
                                    title="Close cart"
                                >
                                    ×
                                </button>
                            </div>
                            
                            <div className="cart-items-container">
                                {Object.entries(selectedItems)
                                    .filter(([_, { quantity }]) => quantity > 0)
                                    .map(([key, { name, quantity, options }]) => (
                                        <div key={key} className="cart-item">
                                            <div className="cart-item-info">
                                                <div className="cart-item-name">
                                                    {name} {quantity > 1 && `x${quantity}`}
                                                </div>
                                                {options.length > 0 && (
                                                    <div className="cart-item-options">
                                                        {options.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="cart-item-price">
                                                ${(calculateItemPrice(name, options) * quantity).toFixed(2)}
                                            </div>
                                            <div className="cart-item-controls">
                                                <button
                                                    type="button" // Add type="button"
                                                    className="cart-quantity-btn cart-minus-btn"
                                                    onClick={(e) => {
                                                        e.preventDefault(); // Prevent form submission
                                                        e.stopPropagation(); // Stop event bubbling
                                                        updateCartQuantity(key, -1);
                                                    }}
                                                >
                                                    −
                                                </button>
                                                <span className="cart-quantity-display">{quantity}</span>
                                                <button
                                                    type="button" // Add type="button"
                                                    className="cart-quantity-btn cart-plus-btn"
                                                    onClick={(e) => {
                                                        e.preventDefault(); // Prevent form submission
                                                        e.stopPropagation(); // Stop event bubbling
                                                        updateCartQuantity(key, 1);
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            
                            <div className="cart-total-line">
                                <div className="cart-total-amount">
                                    Total: ${cartTotal.toFixed(2)}
                                </div>
                                <button 
                                    className="cart-checkout-btn"
                                    onClick={() => {
                                        setShowCartSummary(false);
                                        proceedToCheckout();
                                    }}
                                >
                                    Proceed →
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="menu-categories">
                        {categories.map(category => (
                            <div key={category} className="category-section" id={`section-${category}`}>
                                <h2 className="category-title">{category}</h2>
                                <div className="menu-grid">
                                    {menuItems
                                        .filter(item => item.category === category && item.active !== false)
                                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                                        .map(item => {
                                        const itemQuantity = Object.entries(selectedItems)
                                            .filter(([key]) => key.startsWith(`${item.name}-`))
                                            .reduce((sum, [, itemData]) => sum + itemData.quantity, 0);
                                        
                                        return (
                                            <div key={item.id} className={`menu-item-card ${itemQuantity > 0 ? 'has-items' : ''}`}>
                                                <div className="menu-item-image-container">
                                                    <img className='menu-item-image'
                                                        src={item.image}
                                                        alt={item.name}
                                                    />
                                                    {itemQuantity > 0 && (
                                                        <div className="item-badge">{itemQuantity}</div>
                                                    )}
                                                </div>
                                                <div className="menu-item-content">
                                                    <div className="item-header">
                                                        <h3 className="menu-item-name">{item.name}</h3>
                                                        <span className="menu-item-price">${item.price}</span>
                                                    </div>
                                                    <p className="menu-item-description">{item.description}</p>
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
                                                                            updateCartQuantity(firstKey, -1);
                                                                        } else {
                                                                            updateCartQuantity(firstKey, -1);
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                            className="quantity-btn quantity-btn-minus"
                                                            disabled={itemQuantity === 0}
                                                        >
                                                            −
                                                        </button>
                                                        <span className="quantity-display">{itemQuantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                // Check if item has noModal flag set to true
                                                                if (item.noModal || (!item.options || item.options.length === 0)) {
                                                                    addToCart(item.name, 1, []);
                                                                } else {
                                                                    openModal(item);
                                                                }
                                                            }}
                                                            className="quantity-btn quantity-btn-plus"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </form>
            )}
            {step === 2 && (
                <form onSubmit={handleNameSubmit} className="checkout-form">
                    <div className="back-button-container">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="back-button"
                        >
                            Back
                        </button>
                    </div>
                    <h3>Enter Your Name</h3>
                    <input
                        type="text"
                        placeholder="Enter your name *"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                        className="name-input"
                    />
                    <h3>Email</h3>
                    <input
                        type="email"
                        placeholder="Enter your email (optional)"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="name-input"
                    />
                    <h3>Notes</h3>
                    <textarea
                        placeholder="Enter any allergies, ToGo requests or notes here... (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="notes-textarea"
                    />
                    <div className="order-card">
                        <h3 className="order-title">Your Order</h3>
                        
                        <div className="order-items-container">
                            <ul className="order-items-list">
                                {Object.entries(selectedItems)
                                    .filter(([_, { quantity }]) => quantity > 0)
                                    .map(([key, { name, quantity, options }]) => (
                                        <li key={key} className="kiosk-order-item">
                                            <div className="kiosk-order-item-content">
                                                <div className="kiosk-order-item-details">
                                                    <div className="kiosk-order-item-info">
                                                        <span className="kiosk-order-item-name">{name} {quantity > 1 && `x${quantity}`}</span>
                                                        {options.length > 0 && (
                                                            <span className="kiosk-order-item-options">
                                                                Options: {options.map(option => {
                                                                    const spiceLevels = ['Mild', 'Medium', 'Spicy'];
                                                                    if (spiceLevels.includes(option)) {
                                                                        return `${option}`;
                                                                    }
                                                                    return option;
                                                                }).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="kiosk-order-item-price">
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
                            Subtotal: $
                            {Object.entries(selectedItems)
                                .reduce((sum, [key, { name, quantity, options }]) => {
                                    return sum + (calculateItemPrice(name, options) * quantity);
                                }, 0).toFixed(2)
                            }
                        </div>
                        {notes && (
                            <div className="order-notes">
                                <strong>Notes:</strong> {notes}
                            </div>
                        )}
                        <div className="tax-notice">*Note: Tax and convenience fee will be added at checkout</div>
                    </div>
                    <div className="sticky-place-order">
                        <button
                            className="order-button"
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Proceeding...' : 'Proceed to Checkout'}
                        </button>
                    </div>
                </form>
            )}
            {step === 3 && settings.onlinePaymentEnabled && (
                <PaymentForm
                    orderTotal={Object.entries(selectedItems).reduce((sum, [key, { name, quantity, options }]) => {
                        const itemPrice = calculateItemPrice(name, options);
                        return sum + (itemPrice * quantity);
                    }, 0)}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentCancel={handlePaymentCancel}
                    onPayAtCounter={handlePayAtCounter}
                    payAtCounterEnabled={settings.payAtCounterEnabled}
                    customerName={customerName}
                    orderItems={Object.entries(selectedItems).map(([key, { name, quantity, options }]) => ({
                        name,
                        quantity,
                        options,
                        price: calculateItemPrice(name, options)
                    }))}
                />
            )}
            
            {step === 4 && (
                <div className="confirmation-container">
                    <h2>Order Confirmation</h2>
                    <p className="confirmation-details">Order Number: {orderNumber}</p>
                    <p className="confirmation-name">Name: {customerName}</p>
                    
                    {paymentId ? (
                        <div className="confirmation-payment-success">
                            <div className="confirmation-success-heading">
                                <p>✅ Payment Successful!</p>
                            </div>
                            <p>Your order is now in queue.</p>
                        </div>
                    ) : (
                        <div className="confirmation-payment-counter">
                            <div className="confirmation-counter-heading">
                                <p>💵 Pay at Counter</p>
                            </div>
                            <p>Please pay at the counter to enter preparation queue.</p>
                        </div>
                    )}

                    <div className="confirmation-divider">
                    <div className="confirmation-order-card">
                        <h3 className="confirmation-order-title">Items Ordered</h3>
                        
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
                        
                        {/* Price Breakdown */}
                        <div className="confirmation-pricing-breakdown">
                            <div className="pricing-row">
                                <span>Subtotal:</span>
                                <span>${Object.entries(selectedItems).reduce((sum, [key, { name, quantity, options }]) => {
                                    const itemPrice = calculateItemPrice(name, options);
                                    return sum + (itemPrice * quantity);
                                }, 0).toFixed(2)}</span>
                            </div>
                            {paymentId && (
                                <>
                                <div className="pricing-row">
                                    <span>Tax:</span>
                                    <span>${(Object.entries(selectedItems).reduce((sum, [key, { name, quantity, options }]) => {
                                        const itemPrice = calculateItemPrice(name, options);
                                        return sum + (itemPrice * quantity);
                                    }, 0) * 0.0825).toFixed(2)}</span>
                                </div>
                                <div className="pricing-row">
                                    <span>Convenience Fee:</span>
                                    <span>${(() => {
                                        const sub = Object.entries(selectedItems).reduce((sum, [key, { name, quantity, options }]) => {
                                            const itemPrice = calculateItemPrice(name, options);
                                            return sum + (itemPrice * quantity);
                                        }, 0);
                                        const tax = sub * 0.0825;
                                        return ((sub + tax + tipAmount) * 0.029 + 0.30).toFixed(2);
                                    })()}</span>
                                </div>
                                </>
                            )}
                            {tipAmount > 0 && (
                                <div className="pricing-row tip-row">
                                    <span>Tip:</span>
                                    <span>${tipAmount.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="confirmation-total">
                            Total: $
                            {(() => {
                                const subtotal = Object.entries(selectedItems).reduce((sum, [key, { name, quantity, options }]) => {
                                    const itemPrice = calculateItemPrice(name, options);
                                    return sum + (itemPrice * quantity);
                                }, 0);
                                if (!paymentId) {
                                    // Counter payment: just subtotal + tip
                                    return (subtotal + tipAmount).toFixed(2);
                                }
                                const tax = subtotal * 0.0825;
                                const fee = (subtotal + tax + tipAmount) * 0.029 + 0.30;
                                return (subtotal + tax + fee + tipAmount).toFixed(2);
                            })()}
                        </div>
                        {notes && (
                            <div className="confirmation-notes">
                                <strong>Notes:</strong> {notes}
                            </div>
                        )}
                    </div>
                    </div>
                    
                    <div className="another-order-container">
                        <button
                            onClick={() => {
                                setStep(1);
                                setSelectedItems({});
                                setCustomerName('');
                                setCustomerEmail('');
                                setNotes('');
                                setPaymentId(null);
                                setTipAmount(0); // Reset tip amount
                                setIsSubmitting(false); // Add this line to reset submitting state
                            }}
                            className="another-order-button"
                        >
                            Place Another Order
                        </button>
                    </div>
                </div>
            )}

            {/* Modal - Enhanced with X close button instead of Cancel button */}
            {modalItem && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button 
                            type="button"
                            className="modal-close-btn"
                            onClick={closeModal}
                            aria-label="Close"
                        >
                            ×
                        </button>

                        {modalItem.image && (
                            <div className="modal-item-image-container">
                                <img 
                                    src={modalItem.image} 
                                    alt={modalItem.name} 
                                    className="modal-item-image"
                                />
                            </div>
                        )}

                        <h2>{modalItem.name} Options</h2>
                        
                        {/* Slider for Spice Level */}
                        {modalItem.options?.some(opt => ['Mild', 'Medium', 'Spicy'].includes(opt)) && (
                            <div className="spice-slider-container">
                                <label htmlFor="spice-slider" className="spice-slider-label">Spice Level:</label>
                                <input
                                    type="range"
                                    id="spice-slider"
                                    min={0}
                                    max={2}
                                    step={1}
                                    value={(() => {
                                        const spiceLevels = ['Mild', 'Medium', 'Spicy'];
                                        return itemOptions.spiceLevel ? spiceLevels.indexOf(itemOptions.spiceLevel) : 1;
                                    })()}
                                    onChange={(e) => {
                                        const newLevel = ['Mild', 'Medium', 'Spicy'][parseInt(e.target.value)];
                                        handleSpiceChange(newLevel);
                                    }}
                                    className="spice-slider"
                                />
                                <div className="spice-levels">
                                    <span title="Mild">Mild</span>
                                    <span title="Medium">Medium</span>
                                    <span title="Spicy">Spicy</span>
                                </div>
                            </div>
                        )}

                        {/* Other Options (No Onions, No Cilantro, etc.) - Pill Style */}
                        {(() => {
                            const otherOptions = modalItem.options?.filter(opt => 
                                !['Mild', 'Medium', 'Spicy'].includes(opt) &&
                                !opt.includes('(+$')
                            ) || [];
                            
                            return otherOptions.length > 0 && (
                                <div className="modal-section">
                                    <label className="modal-section-label">Customizations:</label>
                                    <div className="option-pills">
                                        {otherOptions.map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                className={`option-pill ${itemOptions.otherOptions.includes(option) ? 'selected' : ''}`}
                                                onClick={() => handleOtherOptionToggle(option)}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Extra Options (Premium add-ons) */}
                        {modalItem.extraOptions && Object.keys(modalItem.extraOptions).length > 0 && (
                            <div className="modal-section">
                                <label className="modal-section-label">Add Extra:</label>
                                <div className="option-pills">
                                    {Object.entries(modalItem.extraOptions).map(([optionName, price]) => (
                                        <button
                                            key={optionName}
                                            type="button"
                                            className={`option-pill premium ${itemOptions.extraOptions.includes(optionName) ? 'selected' : ''}`}
                                            onClick={() => handleExtraOptionToggle(optionName)}
                                        >
                                            {optionName}
                                            <span className="option-pill-price">+${price}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="modal-buttons single-button">
                            <button 
                                type="button"
                                onClick={handleOptionSubmit}
                                className="modal-add-button"
                            >
                                Add to Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            <Toast 
                show={toast.show}
                message={toast.message}
                type={toast.type}
            />
        </div>
    );
};

export default KioskForm;
