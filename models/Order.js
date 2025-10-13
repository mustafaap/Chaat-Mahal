const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: Number,
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        default: ''
    },
    items: {
        type: [String],
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    tip: {
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    paid: {
        type: Boolean,
        default: false
    },
    paymentId: {
        type: String,
        default: null
    },
    givenItems: {
        type: Map,
        of: Boolean,
        default: {}
    },
    readyEmailSent: {
        type: Boolean,
        default: false
    },
    readyEmailSentAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);