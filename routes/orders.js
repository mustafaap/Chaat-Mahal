const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Create a new order
router.post('/', async (req, res) => {
    const { customerName, items } = req.body;
    const newOrder = new Order({ customerName, items, status: 'Pending' });
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

// Update order status
router.patch('/:id', async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status: 'Completed' }, { new: true });
        req.io.emit('ordersUpdated'); // Notify all clients
        res.json(updatedOrder);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;