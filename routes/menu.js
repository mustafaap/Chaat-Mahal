const express = require('express');
const router = express.Router();
const Menu = require('../models/Menu');
const fs = require('fs').promises;
const path = require('path');
const fsSync = require('fs');

// Helper function to delete image file
const deleteImageFile = (imagePath) => {
    if (imagePath && imagePath.startsWith('/images/') && imagePath !== '/images/default-food.jpg') {
        const filename = path.basename(imagePath);
        const fullPath = path.join(__dirname, '..', 'client', 'public', 'images', filename);
        
        try {
            if (fsSync.existsSync(fullPath)) {
                fsSync.unlinkSync(fullPath);
                console.log(`Deleted image: ${filename}`);
            }
        } catch (error) {
            console.error(`Error deleting image ${filename}:`, error);
        }
    }
};

// Get all menu items
router.get('/', async (req, res) => {
    try {
        const menuItems = await Menu.find().sort({ id: 1 });
        res.json(menuItems);
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ message: 'Failed to load menu items' });
    }
});

// Add new menu item
router.post('/', async (req, res) => {
    try {
        // Get the highest ID and increment
        const lastItem = await Menu.findOne().sort({ id: -1 });
        const newId = lastItem ? lastItem.id + 1 : 1;
        
        const newItem = new Menu({
            ...req.body,
            id: newId,
            price: parseFloat(req.body.price),
            image: req.body.image || '/images/default-food.jpg'
        });
        
        await newItem.save();
        res.status(201).json(newItem);
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ message: 'Failed to add menu item' });
    }
});

// Update menu item
router.put('/:id', async (req, res) => {
    try {
        const itemId = parseInt(req.params.id);
        const oldItem = await Menu.findOne({ id: itemId });
        
        if (!oldItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        
        const newImagePath = req.body.image || '/images/default-food.jpg';
        
        // If image path changed and old image wasn't default, delete old image
        if (oldItem.image && 
            oldItem.image !== newImagePath && 
            oldItem.image.startsWith('/images/') && 
            oldItem.image !== '/images/default-food.jpg') {
            deleteImageFile(oldItem.image);
        }
        
        const updatedItem = await Menu.findOneAndUpdate(
            { id: itemId },
            {
                ...req.body,
                price: parseFloat(req.body.price),
                image: newImagePath
            },
            { new: true }
        );
        
        res.json(updatedItem);
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ message: 'Failed to update menu item' });
    }
});

// Delete menu item
router.delete('/:id', async (req, res) => {
    try {
        const itemId = parseInt(req.params.id);
        const itemToDelete = await Menu.findOne({ id: itemId });
        
        if (!itemToDelete) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        
        // Delete the associated image file
        deleteImageFile(itemToDelete.image);
        
        await Menu.findOneAndDelete({ id: itemId });
        
        res.json({ message: 'Menu item and image deleted successfully' });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ message: 'Failed to delete menu item' });
    }
});

module.exports = router;