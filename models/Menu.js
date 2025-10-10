const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
    id: {
        type: Number,
        unique: true,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        default: '/images/default-food.jpg'
    },
    options: {
        type: [String],
        default: []
    },
    extraOptions: {
        type: Map,
        of: Number,
        default: {}
    },
    category: {
        type: String,
        required: true,
        enum: ['Chaat', 'Wraps', 'Drinks']
    },
    description: {
        type: String,
        default: ''
    },
    noModal: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Menu', menuSchema);