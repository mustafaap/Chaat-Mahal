const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const { getNextOrderNumber } = require('../utils/orderCounter');
const { sendOrderConfirmationEmail, sendOrderReadyEmail } = require('../utils/emailService');

// GET all orders
// Pass ?ignoreReset=true to bypass the view-reset timestamp filter (used by analytics)
router.get('/all', async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const timestampFilePath = path.join(__dirname, '..', 'data', 'resetTimestamp.json');
        
        let resetTimestamp = null;
        if (req.query.ignoreReset !== 'true') {
            try {
                const timestampData = await fs.readFile(timestampFilePath, 'utf8');
                resetTimestamp = JSON.parse(timestampData).timestamp;
            } catch (error) {
                // No reset timestamp file exists, show all orders
            }
        }
        
        // When a reset timestamp exists, only hide Pending orders older than the reset.
        // Completed and Cancelled orders are always shown regardless of the reset.
        const query = resetTimestamp
            ? {
                $or: [
                    { createdAt: { $gte: new Date(resetTimestamp) } },           // any order after reset
                    { status: { $in: ['Completed', 'Cancelled'] } }              // or non-pending regardless of age
                ]
              }
            : {};
        const orders = await Order.find(query).sort({ createdAt: -1 });
        
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
        const { customerName, customerEmail, items, total, tip, taxAmount, convenienceFee, stripeTotal, notes, paymentId, paid } = req.body;

        // Validate required fields
        if (!customerName || !items || !total) {
            return res.status(400).json({ 
                message: 'Missing required fields: customerName, items, or total' 
            });
        }

        // Get the next sequential order number for the day
        const orderNumber = await getNextOrderNumber();
        console.log('Generated order number:', orderNumber); // Debug log

        // Determine paid status: if paymentId exists, order is paid
        const isPaid = paymentId ? true : (paid || false);

        const newOrder = new Order({
            orderNumber,
            customerName,
            customerEmail: customerEmail || '',
            items,
            total,
            tip: tip || 0,
            taxAmount: taxAmount || 0,
            convenienceFee: convenienceFee || 0,
            stripeTotal: stripeTotal || null,
            notes: notes || '',
            status: 'Pending',
            paymentId: paymentId || null,  // Explicitly set paymentId
            paid: isPaid // Explicitly set paid status
        });

        const savedOrder = await newOrder.save();
        console.log('Order saved successfully:', savedOrder._id); // Debug log
        console.log('Order payment details:', { 
            paymentId: savedOrder.paymentId, 
            paid: savedOrder.paid 
        }); // Debug payment status
        
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
                const menuItems = await Menu.find();
                
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
                    tip: tip || 0,
                    taxAmount: taxAmount || 0,
                    convenienceFee: convenienceFee || 0,
                    stripeTotal: stripeTotal || null,
                    paymentId: paymentId || null,
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
        const { paid, taxAmount, convenienceFee, stripeTotal } = req.body;

        const update = { paid };
        if (taxAmount !== undefined) update.taxAmount = taxAmount;
        if (convenienceFee !== undefined) update.convenienceFee = convenienceFee;
        if (stripeTotal !== undefined) update.stripeTotal = stripeTotal;
        
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            update,
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

// PATCH - Toggle item given status
router.patch('/:id/item-given', async (req, res) => {
    try {
        const { itemKey, isGiven } = req.body;
        
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update the givenItems map
        if (!order.givenItems) {
            order.givenItems = new Map();
        }
        order.givenItems.set(itemKey, isGiven);
        
        await order.save();

        req.io.emit('ordersUpdated');
        res.json(order);
    } catch (error) {
        console.error('Error updating item given status:', error);
        res.status(500).json({ message: 'Failed to update item status' });
    }
});

// POST - Send order ready notification email
router.post('/:id/notify-ready', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (!order.customerEmail) {
            return res.status(400).json({ message: 'No email address found for this order' });
        }

        const emailData = {
            customerName: order.customerName,
            orderNumber: order.orderNumber
        };

        const emailResult = await sendOrderReadyEmail(order.customerEmail, emailData);
        
        if (emailResult.success) {
            console.log('✅ Order ready email sent successfully');
            res.json({ 
                message: 'Order ready notification sent successfully',
                messageId: emailResult.messageId 
            });
        } else {
            console.log('⚠️ Order ready email failed:', emailResult.error);
            res.status(500).json({ 
                message: 'Failed to send order ready notification',
                error: emailResult.error 
            });
        }
    } catch (error) {
        console.error('❌ Error sending order ready notification:', error);
        res.status(500).json({ message: 'Failed to send order ready notification' });
    }
});

// POST - Reset order view timestamp (cancel pending orders + hide old orders)
router.post('/reset-timestamp', async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const timestampFilePath = path.join(__dirname, '..', 'data', 'resetTimestamp.json');

        // Cancel all currently pending orders so they count correctly in analytics
        const cancelResult = await Order.updateMany(
            { status: 'Pending' },
            { status: 'Cancelled' }
        );
        console.log(`Reset: cancelled ${cancelResult.modifiedCount} pending order(s)`);

        // Save reset timestamp so the board hides pre-reset orders going forward
        const resetData = {
            timestamp: new Date().toISOString()
        };
        
        // Ensure data directory exists
        await fs.mkdir(path.dirname(timestampFilePath), { recursive: true });
        await fs.writeFile(timestampFilePath, JSON.stringify(resetData, null, 2));
        
        req.io.emit('ordersUpdated');
        res.json({
            message: 'Order view reset successfully',
            timestamp: resetData.timestamp,
            cancelledOrders: cancelResult.modifiedCount
        });
    } catch (error) {
        console.error('Error resetting order view:', error);
        res.status(500).json({ message: 'Failed to reset order view' });
    }
});

module.exports = router;