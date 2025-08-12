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

// Get all orders (pending and completed)
router.get('/all', async (req, res) => {
    try {
        const orders = await Order.find();
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