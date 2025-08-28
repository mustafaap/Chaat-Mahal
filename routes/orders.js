const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { getNextOrderNumber } = require('../utils/orderCounter');
const { sendOrderConfirmationEmail } = require('../utils/emailService');

// GET all orders
router.get('/all', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// POST a new order
router.post('/', async (req, res) => {
    console.log('Received order data:', req.body); // Debug log
    
    try {
        const { customerName, customerEmail, items, total, notes } = req.body;

        // Validate required fields
        if (!customerName || !items || !total) {
            return res.status(400).json({ 
                message: 'Missing required fields: customerName, items, or total' 
            });
        }

        // Get the next sequential order number for the day
        const orderNumber = await getNextOrderNumber();
        console.log('Generated order number:', orderNumber); // Debug log

        const newOrder = new Order({
            orderNumber,
            customerName,
            customerEmail: customerEmail || '',
            items,
            total,
            notes: notes || '',
            status: 'Pending'
        });

        const savedOrder = await newOrder.save();
        console.log('Order saved successfully:', savedOrder._id); // Debug log
        
        // Send confirmation email if email is provided (non-blocking)
        if (customerEmail) {
            try {
                console.log('Attempting to send email to:', customerEmail); // Debug log
                
                // Helper function to calculate item price with options
                const calculateItemPrice = (itemString, menuItems) => {
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
                
                // Read menu items to calculate prices
                const fs = require('fs').promises;
                const path = require('path');
                const menuPath = path.join(__dirname, '..', 'data', 'menu.json');
                const menuData = await fs.readFile(menuPath, 'utf8');
                const menuItems = JSON.parse(menuData);
                
                // Group items by name and options, then calculate quantities
                const itemCounts = {};
                items.forEach(itemString => {
                    const key = itemString; // Use the full string as key to group identical items
                    itemCounts[key] = (itemCounts[key] || 0) + 1;
                });

                // Prepare email data with quantities
                const emailData = {
                    customerName,
                    orderNumber,
                    items: Object.entries(itemCounts).map(([itemString, quantity]) => {
                        const parts = itemString.split(' (');
                        const name = parts[0];
                        const options = parts[1] ? parts[1].replace(')', '').split(', ') : [];
                        const itemPrice = calculateItemPrice(itemString, menuItems);
                        
                        return {
                            name,
                            options,
                            quantity,
                            price: itemPrice
                        };
                    }),
                    total,
                    notes: notes || ''
                };
                
                const emailResult = await sendOrderConfirmationEmail(customerEmail, emailData);
                
                if (emailResult.success) {
                    console.log('✅ Email sent successfully');
                } else {
                    console.log('⚠️ Email failed but order created:', emailResult.error);
                }
            } catch (emailError) {
                console.error('⚠️ Email error (non-blocking):', emailError.message);
                // Don't fail the order creation if email fails
            }
        }
        
        // Emit socket event for real-time updates
        req.io.emit('ordersUpdated');
        
        res.status(201).json(savedOrder);
        
    } catch (error) {
        console.error('❌ Error creating order:', error);
        res.status(500).json({ 
            message: 'Failed to create order', 
            error: error.message 
        });
    }
});

// PATCH - Update order paid status
router.patch('/:id/paid', async (req, res) => {
    try {
        const { paid } = req.body;
        
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { paid: paid },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        req.io.emit('ordersUpdated');
        res.json(order);
    } catch (error) {
        console.error('Error updating paid status:', error);
        res.status(500).json({ message: 'Failed to update paid status' });
    }
});

// PATCH - Update order status to completed
router.patch('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: 'Completed' },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        req.io.emit('ordersUpdated');
        res.json(order);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Failed to update order' });
    }
});

// PATCH - Revert order status to pending
router.patch('/:id/revert', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: 'Pending' },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        req.io.emit('ordersUpdated');
        res.json(order);
    } catch (error) {
        console.error('Error reverting order:', error);
        res.status(500).json({ message: 'Failed to revert order' });
    }
});

// DELETE - Cancel a specific order
router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: 'Cancelled' },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        req.io.emit('ordersUpdated');
        res.json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Failed to cancel order' });
    }
});

// DELETE - Reset all orders (admin function)
router.delete('/', async (req, res) => {
    try {
        await Order.deleteMany({});
        
        // Optionally reset the daily counter as well
        const fs = require('fs').promises;
        const path = require('path');
        const counterFilePath = path.join(__dirname, '..', 'data', 'orderCounter.json');
        
        try {
            await fs.unlink(counterFilePath);
            console.log('Order counter reset');
        } catch (err) {
            // Counter file doesn't exist, that's fine
        }
        
        req.io.emit('ordersUpdated');
        res.json({ message: 'All orders deleted successfully' });
    } catch (error) {
        console.error('Error deleting orders:', error);
        res.status(500).json({ message: 'Failed to delete orders' });
    }
});

// PUT - Update order items and total
router.put('/:id', async (req, res) => {
    try {
        const { items, total } = req.body;
        
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { items, total },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        req.io.emit('ordersUpdated');
        res.json(order);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Failed to update order' });
    }
});

module.exports = router;