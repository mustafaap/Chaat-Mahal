import React, { useEffect, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import ConfirmationModal from './ConfirmationModal';
import ItemSummary from './ItemSummary'; // Import ItemSummary component
import '../styles/OrderList.css';

const socket = io();

const OrderList = ({ currentView, setCurrentView }) => {
    const [orders, setOrders] = useState([]);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [menuItems, setMenuItems] = useState([]);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editOrderItems, setEditOrderItems] = useState({});
    const [editItemPrices, setEditItemPrices] = useState({});
    const [editOptionModal, setEditOptionModal] = useState(null);
    const [editItemOptions, setEditItemOptions] = useState({});
    
    // Add pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [ordersPerPage] = useState(10);
    
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

    const fetchMenuItems = async () => {
        try {
            const response = await axios.get('/api/menu');
            setMenuItems(response.data);
        } catch (error) {
            console.error('Error fetching menu items:', error);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchMenuItems(); // Fetch menu items on component mount
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
                    // No need to clear givenItems - it's preserved in the database
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
                    await axios.patch(`/api/orders/${id}/revert`);
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
    const toggleItemGiven = async (orderId, itemKey) => {
        try {
            const order = orders.find(o => o._id === orderId);
            const currentStatus = order?.givenItems?.[itemKey] || false;
            const newStatus = !currentStatus;
            
            await axios.patch(`/api/orders/${orderId}/item-given`, {
                itemKey,
                isGiven: newStatus
            });
            
            // Update local state immediately for better UX
            setOrders(prevOrders => 
                prevOrders.map(order => 
                    order._id === orderId 
                        ? {
                            ...order,
                            givenItems: {
                                ...order.givenItems,
                                [itemKey]: newStatus
                            }
                        }
                        : order
                )
            );
        } catch (error) {
            console.error('Error toggling item given status:', error);
            alert('Failed to update item status. Please try again.');
        }
    };

    // Check if all items in an order have been given
    const areAllItemsGiven = (order, itemCounts) => {
        const orderGivenItems = order.givenItems || {};
        return Object.keys(itemCounts).every(itemName => orderGivenItems[itemName]);
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

    // Edit order functions
    const startEditingOrder = (order) => {
        const itemCounts = {};
        const itemPrices = {}; // Store the actual price paid for each item type
        
        order.items.forEach(item => {
            // Use the full item string (including options) as the key instead of just the name
            const itemKey = item; // Keep the full "Masala Puri (No Onions, Mild)" format
            
            // Calculate the actual price that was paid for this item (including premium options)
            const itemPrice = calculateOriginalItemPrice(item);
            
            // Group items by full key (name + options)
            itemCounts[itemKey] = (itemCounts[itemKey] || 0) + 1;
            
            // Store the price for this item type
            itemPrices[itemKey] = itemPrice;
        });
        
        setEditOrderItems(itemCounts);
        setEditItemPrices(itemPrices);
        setEditingOrder(order);
    };

    const cancelEditingOrder = () => {
        setEditingOrder(null);
        setEditOrderItems({});
        setEditItemPrices({}); // Clear prices too
    };

    const updateEditItemQuantity = (itemKey, change) => {
        setEditOrderItems(prev => {
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

    const addNewItemToEdit = (itemName) => {
        const menuItem = menuItems.find(item => item.name === itemName);
        if (menuItem && !menuItem.noModal && menuItem.options && menuItem.options.length > 0) {
            openEditOptionsModal(itemName);
        } else {
            // No options or noModal flag is true, add directly
            setEditOrderItems(prev => ({
                ...prev,
                [itemName]: (prev[itemName] || 0) + 1
            }));
            
            if (!editItemPrices[itemName]) {
                setEditItemPrices(prev => ({
                    ...prev,
                    [itemName]: menuItem ? menuItem.price : 0
                }));
            }
        }
    };

    // Add function to open options modal for editing
    const openEditOptionsModal = (itemName) => {
        const menuItem = menuItems.find(item => item.name === itemName);
        if (menuItem && menuItem.options && menuItem.options.length > 0) {
            // Set default options when opening modal
            let defaultOptions = [];
            
            // Set default spice level for items that have spice options
            if (menuItem.options?.some(opt => ['No Spice', 'Regular', 'Extra Spicy'].includes(opt))) {
                defaultOptions.push('Regular'); // Default to Regular
            }
            
            // Set default "Cold" option for Water
            if (menuItem.name === 'Water') {
                defaultOptions.push('Cold'); // Default to Cold
            }
            
            setEditItemOptions({
                [itemName]: defaultOptions
            });
            setEditOptionModal({ itemName, menuItem });
        } else {
            // If no options, just add the base item
            addNewItemToEdit(itemName);
        }
    };

    const closeEditOptionsModal = () => {
        setEditOptionModal(null);
        setEditItemOptions({});
    };

    const handleEditOptionSubmit = () => {
        const { itemName, menuItem, editingKey } = editOptionModal;
        const selectedOptions = editItemOptions[itemName] || [];
        
        // Calculate price with options
        let itemPrice = menuItem.price;
        if (menuItem.extraOptions && selectedOptions.length > 0) {
            selectedOptions.forEach(option => {
                if (menuItem.extraOptions[option]) {
                    itemPrice += menuItem.extraOptions[option];
                } else {
                    const baseOptionName = option.replace(/\s*\(\+\$\d+(\.\d+)?\)/, '');
                    if (menuItem.extraOptions[baseOptionName]) {
                        itemPrice += menuItem.extraOptions[baseOptionName];
                    }
                }
            });
        }

        // Create new item key with options
        const newItemKey = selectedOptions.length > 0 
            ? `${itemName} (${selectedOptions.join(', ')})`
            : itemName;

        setEditOrderItems(prev => {
            const updated = { ...prev };
            
            if (editingKey) {
                // Editing existing item - transfer quantity to new key
                const quantity = updated[editingKey] || 1;
                delete updated[editingKey];
                updated[newItemKey] = quantity;
            } else {
                // Adding new item
                updated[newItemKey] = (updated[newItemKey] || 0) + 1;
            }
            
            return updated;
        });

        // Update prices
        setEditItemPrices(prev => {
            const updated = { ...prev };
            if (editingKey) {
                delete updated[editingKey];
            }
            updated[newItemKey] = itemPrice;
            return updated;
        });

        closeEditOptionsModal();
    };

    const calculateOriginalItemPrice = (itemString) => {
        const parts = itemString.split(' (');
        const itemName = parts[0];
        const options = parts[1] ? parts[1].replace(')', '').split(', ') : [];
        
        const menuItem = menuItems.find(item => item.name === itemName);
        if (!menuItem) return 0;
        
        let price = menuItem.price;
        
        // Add extra option costs
        if (menuItem.extraOptions && options.length > 0) {
            options.forEach(option => {
                // Check if the option exists directly in extraOptions
                if (menuItem.extraOptions[option]) {
                    price += menuItem.extraOptions[option];
                } else {
                    // Handle options with (+$X) format - extract the base name
                    const baseOptionName = option.replace(/\s*\(\+\$\d+(\.\d+)?\)/, '');
                    if (menuItem.extraOptions[baseOptionName]) {
                        price += menuItem.extraOptions[baseOptionName];
                    }
                }
            });
        }
        
        return price;
    };

    const calculateEditOrderTotal = () => {
        return Object.entries(editOrderItems).reduce((total, [itemName, quantity]) => {
            // For existing items that were in the original order, use the stored price
            // For new items added during editing, use the base menu price
            const itemPrice = editItemPrices[itemName] || (() => {
                const menuItem = menuItems.find(item => item.name === itemName);
                return menuItem ? menuItem.price : 0;
            })();
            
            return total + (itemPrice * quantity);
        }, 0);
    };

    const saveEditedOrder = async () => {
        if (Object.keys(editOrderItems).length === 0) {
            alert('Order must have at least one item');
            return;
        }

        const newItems = [];
        const originalItemsByName = {};
        
        // Group original items by name to preserve their option format
        editingOrder.items.forEach(item => {
            const itemName = item.split(' (')[0];
            if (!originalItemsByName[itemName]) {
                originalItemsByName[itemName] = [];
            }
            originalItemsByName[itemName].push(item);
        });

        Object.entries(editOrderItems).forEach(([itemName, quantity]) => {
            // For existing items, preserve the original format with options
            if (originalItemsByName[itemName]) {
                const originalItems = originalItemsByName[itemName];
                for (let i = 0; i < quantity; i++) {
                    // Use the original item format if available, otherwise use base name
                    newItems.push(originalItems[i] || itemName);
                }
            } else {
                // For new items added during editing, just use the item name
                for (let i = 0; i < quantity; i++) {
                    newItems.push(itemName);
                }
            }
        });

        const newTotal = calculateEditOrderTotal();

        try {
            await axios.put(`/api/orders/${editingOrder._id}`, {
                items: newItems,
                total: newTotal
            });
            
            // Update local state
            setOrders(orders.map(order => 
                order._id === editingOrder._id 
                    ? { ...order, items: newItems, total: newTotal }
                    : order
            ));
            
            // Clear given items for this order since items have changed
            cancelEditingOrder();
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Failed to update order. Please try again.');
        }
    };

    // Pagination helper functions
    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    
    const paginateOrders = (ordersList) => {
        return ordersList.slice(indexOfFirstOrder, indexOfLastOrder);
    };
    
    const totalPages = (ordersList) => {
        return Math.ceil(ordersList.length / ordersPerPage);
    };
    
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    // Reset to page 1 when view changes
    useEffect(() => {
        setCurrentPage(1);
    }, [view]);

    const [emailSending, setEmailSending] = useState({});

    // Add this state for tracking green button status
    const [emailButtonClicked, setEmailButtonClicked] = useState({});

    const sendOrderReadyNotification = async (orderId) => {
        try {
            const order = orders.find(o => o._id === orderId);
            if (!order.customerEmail) {
                alert('No email address found for this order. Cannot send notification.');
                return;
            }

            openModal({
                type: 'default',
                title: 'Send Ready Notification',
                message: `Send "Order Ready" email to ${order.customerName} at ${order.customerEmail}?`,
                confirmText: 'Send Email',
                cancelText: 'Cancel',
                onConfirm: async () => {
                    try {
                        const response = await axios.post(`/api/orders/${orderId}/notify-ready`);
                        
                        // Turn button green after email is sent
                        setEmailButtonClicked(prev => ({ ...prev, [orderId]: true }));
                        
                    } catch (error) {
                        console.error('Error sending order ready notification:', error);
                        if (error.response?.status === 400) {
                            alert('No email address found for this order.');
                        } else {
                            alert('Failed to send order ready notification. Please try again.');
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error sending order ready notification:', error);
            alert('Failed to send order ready notification. Please try again.');
        }
    };

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
                    
                    <ItemSummary orders={orders} />
                    
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
                                const allItemsGiven = areAllItemsGiven(order, itemCounts);
                                const isBeingEdited = editingOrder?._id === order._id;
                                
                                // Determine payment method based on paymentId
                                const isCounterPayment = order.paid && !order.paymentId;

                                return (
                                    <li key={order._id} className={`order-item ${allItemsGiven ? 'all-items-given' : ''} ${order.paid ? 'order-paid' : ''} ${isCounterPayment ? 'counter-payment' : ''}`}>
                                        <div className="order-info">
                                            <div className="order-header">
                                                <div className="order-header-main">
                                                    Order #{order.orderNumber || order._id.slice(-4)} - {order.customerName}
                                                    <span className="order-timestamp">
                                                        {orderAge}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="order-info-section">
                                                <div className="info-card">
                                                    <div className="order-items">
                                                        <div className="order-items-header">
                                                            <div className="items-header-content">
                                                                <span>Items to Prepare</span>
                                                                {!isBeingEdited && (
                                                                    <button 
                                                                        className="edit-order-btn"
                                                                        onClick={() => startEditingOrder(order)}
                                                                        title="Edit order items"
                                                                    >
                                                                        ✏️ Edit
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {isBeingEdited ? (
                                                            // Edit mode
                                                            <div className="edit-order-container">
                                                                <div className="edit-items-list">
                                                                    {Object.entries(editOrderItems).map(([itemKey, qty]) => {
                                                                        const itemName = itemKey.split(' (')[0];
                                                                        const hasOptions = itemKey.includes('(');
                                                                        const menuItem = menuItems.find(item => item.name === itemName);
                                                                        const canHaveOptions = menuItem?.options?.length > 0;
                                                                        
                                                                        return (
                                                                            <div key={itemKey} className="edit-order-item">
                                                                                <div className="edit-item-info">
                                                                                    <strong>{qty}x&nbsp;</strong> {itemKey}
                                                                                </div>
                                                                                <div className="edit-item-controls">
                                                                                    <button
                                                                                        type="button"
                                                                                        className="edit-qty-btn minus"
                                                                                        onClick={() => updateEditItemQuantity(itemKey, -1)}
                                                                                    >
                                                                                        −
                                                                                    </button>
                                                                                    <span className="edit-qty-display">{qty}</span>
                                                                                    <button
                                                                                        type="button"
                                                                                        className="edit-qty-btn plus"
                                                                                        onClick={() => updateEditItemQuantity(itemKey, 1)}
                                                                                    >
                                                                                        +
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                
                                                                <div className="add-item-section">
                                                                    <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50', fontSize: '1rem' }}>Add Items</h4>
                                                                    <div className="add-item-pills">
                                                                        {menuItems.map(item => (
                                                                            <div 
                                                                                key={item.id} 
                                                                                className="add-item-pill"
                                                                                onClick={() => addNewItemToEdit(item.name)}
                                                                            >
                                                                                <span>{item.name}</span>
                                                                                <span className="add-item-pill-price">${item.price}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="edit-order-total">
                                                                    New Total: ${calculateEditOrderTotal().toFixed(2)}
                                                                </div>
                                                                
                                                                <div className="edit-order-actions">
                                                                    <button 
                                                                        className="save-edit-btn"
                                                                        onClick={saveEditedOrder}
                                                                    >
                                                                        Save Changes
                                                                    </button>
                                                                    <button 
                                                                        className="cancel-edit-btn"
                                                                        onClick={cancelEditingOrder}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            // Normal view mode
                                                            Object.entries(itemCounts).map(([name, qty]) => {
                                                                const isGiven = order.givenItems?.[name];
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
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="info-card">
                                                    <div className="admin-order-total">
                                                        Total: ${order.total.toFixed(2)}
                                                        {/*Total: ${isBeingEdited ? calculateEditOrderTotal().toFixed(2) : order.total}*/}
                                                    </div>
                                                </div>
                                            </div>

                                            {order.notes && (
                                                <div className="order-notes">
                                                    <strong>Special Instructions:</strong> {order.notes}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {!isBeingEdited && (
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
                                                    // Paid state: Send Ready Email (top), Complete and Undo/Cancel (bottom split)
                                                    <>
                                                    <div className="bottom-controls">
                                                        <button
                                                            onClick={() => sendOrderReadyNotification(order._id)}
                                                            className={`control-button ready-button half-width-btn ${
                                                                !order.customerEmail ? 'disabled-btn' : 
                                                                emailButtonClicked[order._id] ? 'email-clicked-green' : ''
                                                            }`}
                                                            title={order.customerEmail ? "Send 'Order Ready' email notification" : "No email address available"}
                                                            disabled={!order.customerEmail || emailSending[order._id]}
                                                        >
                                                            {emailSending[order._id] ? 'Sending...' : order.customerEmail ? 'Send Ready Email' : 'No Email Available'}
                                                        </button>
                                                        
                                                            <button
                                                                onClick={() => completeOrder(order._id)}
                                                                className={`control-button complete-button half-width-btn ${allItemsGiven ? 'ready-to-complete' : ''}`}
                                                                title="Mark order as completed"
                                                            >
                                                                Complete Order
                                                            </button>
                                                            <div className="bottom-sub-controls">
                                                                <button
                                                                    onClick={() => markAsPaid(order._id)}
                                                                    className="control-button undo-payment-button quarter-width-btn"
                                                                    title="Undo payment - mark as unpaid"
                                                                >
                                                                    Undo Payment
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteOrder(order._id)}
                                                                    className="control-button delete-button quarter-width-btn"
                                                                    title="Cancel/Delete order"
                                                                >
                                                                    Cancel Order
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
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
                        {paginateOrders(completedOrders
                            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)))
                            .map(order => {
                                const itemCounts = {};
                                order.items.forEach(item => {
                                    itemCounts[item] = (itemCounts[item] || 0) + 1;
                                });

                                const completedTime = getOrderAge(order.updatedAt || order.createdAt);
                                
                                // Determine payment method based on paymentId - ADD THIS LINE
                                const isCounterPayment = order.paid && !order.paymentId;

                                return (
                                    <li key={order._id} className={`order-item ${order.paid ? 'order-paid' : ''} ${isCounterPayment ? 'counter-payment' : ''}`}>
                                        <div className="order-info">
                                            <div className="order-header">
                                                <div className="order-header-with-revert">
                                                    <div className="order-header-main">
                                                        Order #{order.orderNumber ||order._id.slice(-4)} - {order.customerName}
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
                                                        Total: ${order.total.toFixed(2)}
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
                    
                    {/* Add pagination for completed orders */}
                    {completedOrders.length > ordersPerPage && (
                        <div className="pagination-container">
                            <button
                                className="pagination-btn"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>
                            <span className="pagination-info">
                                Page {currentPage} of {totalPages(completedOrders)}
                            </span>
                            <button
                                className="pagination-btn"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages(completedOrders)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {view === 'cancelled' && (
                <>
                    <h1>Cancelled Orders ({cancelledOrders.length})</h1>
                    <ul className="orders-list">
                        {cancelledOrders.length === 0 && 
                            <li className="empty-orders">No cancelled orders! 🎉</li>}
                        {paginateOrders(cancelledOrders
                            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)))
                            .map(order => {
                                const itemCounts = {};
                                order.items.forEach(item => {
                                    itemCounts[item] = (itemCounts[item] || 0) + 1;
                                });

                                const cancelledTime = getOrderAge(order.updatedAt || order.createdAt);
                                
                                // Determine payment method based on paymentId - ADD THIS LINE
                                const isCounterPayment = order.paid && !order.paymentId;

                                return (
                                    <li key={order._id} className={`order-item ${order.paid ? 'order-paid cancelled-order' : 'cancelled-order'} ${isCounterPayment ? 'counter-payment' : ''}`}>
                                        <div className="order-info">
                                            <div className="order-header">
                                                <div className="order-header-with-revert">
                                                    <div className="order-header-main">
                                                        Order #{order.orderNumber || order._id.slice(-4)} - {order.customerName}
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
                                                        Total: ${order.total.toFixed(2)}
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
                    
                    {/* Add pagination for cancelled orders */}
                    {cancelledOrders.length > ordersPerPage && (
                        <div className="pagination-container">
                            <button
                                className="pagination-btn"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>
                            <span className="pagination-info">
                                Page {currentPage} of {totalPages(cancelledOrders)}
                            </span>
                            <button
                                className="pagination-btn"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages(cancelledOrders)}
                            >
                                Next
                            </button>
                        </div>
                    )}
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

            {/* Options Modal */}
            {editOptionModal && (
                <div className="edit-options-modal-overlay">
                    <div className="edit-options-modal">
                        <div className="edit-options-header">
                            <h3>
                                {editOptionModal.editingKey ? 'Edit Options for' : 'Select Options for'} {editOptionModal.itemName}
                            </h3>
                            <button 
                                className="close-modal-btn" 
                                onClick={closeEditOptionsModal}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="edit-options-content">
                            {/* Spice Level Slider */}
                            {editOptionModal.menuItem.options?.some(opt => ['No Spice', 'Regular', 'Extra Spicy'].includes(opt)) && (
                                <div className="spice-section">
                                    <label>Spice Level:</label>
                                    <div className="spice-selector">
                                        <input
                                            type="range"
                                            min="0"
                                            max="2"  // Changed from 3 to 2
                                            value={(() => {
                                                const currentOptions = editItemOptions[editOptionModal.itemName] || [];
                                                const spiceLevels = ['No Spice', 'Regular', 'Extra Spicy']; // Updated array
                                                const currentSpice = currentOptions.find(opt => spiceLevels.includes(opt));
                                                return spiceLevels.indexOf(currentSpice) !== -1 ? spiceLevels.indexOf(currentSpice) : 1; // Default to Regular
                                            })()}
                                            onChange={(e) => {
                                                const spiceLevels = ['No Spice', 'Regular', 'Extra Spicy']; // Updated array
                                                const newLevel = spiceLevels[parseInt(e.target.value)];
                                                setEditItemOptions(prev => ({
                                                    ...prev,
                                                    [editOptionModal.itemName]: [
                                                        ...(prev[editOptionModal.itemName]?.filter(opt => !spiceLevels.includes(opt)) || []),
                                                        newLevel
                                                    ]
                                                }));
                                            }}
                                            className="spice-slider"
                                        />
                                        <div className="spice-levels">
                                            <span>No Spice</span>
                                            <span>Regular</span>
                                            <span>Extra Spicy</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Other Options */}
                            {editOptionModal.menuItem.options?.filter(opt => !['No Spice', 'Regular', 'Extra Spicy'].includes(opt)).map(option => (
                                <div key={option} className="option-container">
                                    <label className="option-label">
                                        <input
                                            type={editOptionModal.menuItem.name === 'Mango Lassi' || editOptionModal.menuItem.name === 'Water' ? 'radio' : 'checkbox'}
                                            name={editOptionModal.menuItem.name === 'Mango Lassi' ? 'mango-lassi-options' : editOptionModal.menuItem.name === 'Water' ? 'water-options' : option}
                                            checked={editItemOptions[editOptionModal.itemName]?.includes(option) || false}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setEditItemOptions(prev => {
                                                    const currentOptions = prev[editOptionModal.itemName] || {};
                                                    
                                                    if (editOptionModal.menuItem.name === 'Mango Lassi' || editOptionModal.menuItem.name === 'Water') {
                                                        return { ...prev, [editOptionModal.itemName]: checked ? [option] : [] };
                                                    } else {
                                                        if (checked) {
                                                            return { ...prev, [editOptionModal.itemName]: [...currentOptions, option] };
                                                        } else {
                                                            return {
                                                                ...prev,
                                                                [editOptionModal.itemName]: currentOptions.filter(opt => opt !== option)
                                                            };
                                                        }
                                                    }
                                                });
                                            }}
                                        />
                                        <span className="option-text">
                                            {option}
                                        </span>
                                    </label>
                                </div>
                            ))}
                        </div>

                        <div className="edit-options-actions">
                            <button 
                                className="confirm-options-btn"
                                onClick={handleEditOptionSubmit}
                            >
                                {editOptionModal.editingKey ? 'Update Item' : 'Add Item'}
                            </button>
                            <button 
                                className="cancel-options-btn"
                                onClick={closeEditOptionsModal}
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

export default OrderList;