const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Create a new order
router.post('/', async (req, res) => {
    const { customerName, items, total, notes } = req.body;
    const newOrder = new Order({ 
        customerName, 
        items, 
        total,
        notes: notes || '',
        status: 'Pending' 
    });
    try {
        const savedOrder = await newOrder.save();
        req.io.emit('ordersUpdated'); // Notify all clients
        res.status(201).json(savedOrder);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Store reset timestamp
router.post('/reset-timestamp', async (req, res) => {
    try {
        // You can store this in a simple way - either in a separate collection
        // or use a file/environment variable. For simplicity, I'll use a global variable
        global.resetTimestamp = new Date();
        req.io.emit('ordersUpdated'); // Notify all clients
        res.json({ message: 'Reset timestamp set successfully.', timestamp: global.resetTimestamp });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get reset timestamp
router.get('/reset-timestamp', async (req, res) => {
    try {
        res.json({ timestamp: global.resetTimestamp || null });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all orders (pending and completed)
router.get('/all', async (req, res) => {
    try {
        let query = {};
        
        // If there's a reset timestamp, only show orders after that time
        if (global.resetTimestamp) {
            query.createdAt = { $gte: global.resetTimestamp };
        }
        
        const orders = await Order.find(query);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update order status with timestamp
router.patch('/:id', async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id, 
            { 
                status: 'Completed',
                updatedAt: new Date()
            }, 
            { new: true }
        );
        req.io.emit('ordersUpdated');
        res.json(updatedOrder);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update order paid status
router.patch('/:id/paid', async (req, res) => {
    try {
        const { paid } = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id, 
            { 
                paid: paid,
                updatedAt: new Date()
            }, 
            { new: true }
        );
        req.io.emit('ordersUpdated');
        res.json(updatedOrder);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete an order (mark as Cancelled) with timestamp
router.delete('/:id', async (req, res) => {
    try {
        const deletedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { 
                status: 'Cancelled',
                updatedAt: new Date()
            },
            { new: true }
        );
        req.io.emit('ordersUpdated');
        res.json(deletedOrder);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete all orders
router.delete('/', async (req, res) => {
    try {
        await Order.deleteMany({});
        req.io.emit('ordersUpdated'); // Notify all clients
        res.json({ message: 'All orders have been reset.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;