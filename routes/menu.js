const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const fsSync = require('fs');

// Path to store menu items (you can also use a database)
const menuFilePath = path.join(__dirname, '..', 'data', 'menu.json');

// Ensure data directory exists
const ensureDataDirectory = async () => {
    const dataDir = path.dirname(menuFilePath);
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
};

// Helper function to read menu items
const readMenuItems = async () => {
    try {
        await ensureDataDirectory();
        const data = await fs.readFile(menuFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return default menu items
        return [
            { 
                id: 1, 
                name: 'Samosa', 
                price: 2, 
                image: '/images/samosa.JPG', 
                options: [], 
                extraOptions: {},
                category: 'Chaat', 
                description: 'Crispy pastry filled with spiced potatoes and peas' 
            },
            { 
                id: 2, 
                name: 'Panipuri', 
                price: 3, 
                image: '/images/panipuri.JPG', 
                options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro'], // Only 3 spice levels
                extraOptions: {},
                category: 'Chaat', 
                description: 'Crispy shells filled with spiced water and chutneys' 
            },
            { 
                id: 3, 
                name: 'Masala Puri', 
                price: 4, 
                image: '/images/masala-puri.JPG', 
                options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro'], // Only 3 spice levels
                extraOptions: {},
                category: 'Chaat', 
                description: 'Crispy puris topped with spiced potatoes and chutneys' 
            },
            { 
                id: 4, 
                name: 'Dahipuri', 
                price: 6, 
                image: '/images/dahipuri.JPG', 
                options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro'], // Only 3 spice levels
                extraOptions: {},
                category: 'Chaat', 
                description: 'Puris filled with yogurt, chutneys and spices' 
            },
            { 
                id: 5, 
                name: 'Sevpuri', 
                price: 6, 
                image: '/images/sevpuri.JPG', 
                options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro'], // Only 3 spice levels
                extraOptions: {},
                category: 'Chaat', 
                description: 'Crispy puris topped with sev, vegetables and chutneys' 
            },
            { 
                id: 6, 
                name: 'Bhelpuri', 
                price: 7, 
                image: '/images/bhelpuri.JPG', 
                options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro'], // Only 3 spice levels
                extraOptions: {},
                category: 'Chaat', 
                description: 'Popular street snack with puffed rice and chutneys' 
            },
            { 
                id: 7, 
                name: 'Water', 
                price: 1, 
                image: '/images/water.JPG', 
                options: ['Cold', 'Room Temperature'], 
                extraOptions: {},
                category: 'Drinks', 
                description: 'Refreshing drinking water' 
            },
            { 
                id: 8, 
                name: 'Paneer Wrap', 
                price: 8, 
                image: '/images/paneer-wrap.JPG', 
                options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro', 'Extra Paneer (+$2)'], // Only 3 spice levels
                extraOptions: { 'Extra Paneer': 2 },
                category: 'Wraps',
                description: 'Grilled paneer with fresh vegetables wrapped in naan'
            },
            { 
                id: 9, 
                name: 'Chicken Wrap', 
                price: 9, 
                image: '/images/chicken-wrap.JPG', 
                options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro', 'Extra Meat (+$2)'], // Only 3 spice levels
                extraOptions: { 'Extra Meat': 2 },
                category: 'Wraps',
                description: 'Tender spiced chicken with vegetables wrapped in naan'
            }
        ];
    }
};

// Helper function to write menu items
const writeMenuItems = async (menuItems) => {
    await ensureDataDirectory();
    await fs.writeFile(menuFilePath, JSON.stringify(menuItems, null, 2));
};

// Helper function to delete image file
const deleteImageFile = (imagePath) => {
    if (imagePath && imagePath.startsWith('/images/')) {
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
        const menuItems = await readMenuItems();
        res.json(menuItems);
    } catch (error) {
        console.error('Error reading menu items:', error);
        res.status(500).json({ message: 'Failed to load menu items' });
    }
});

// Add new menu item
router.post('/', async (req, res) => {
    try {
        const menuItems = await readMenuItems();
        const newItem = {
            id: Math.max(...menuItems.map(item => item.id), 0) + 1,
            ...req.body,
            price: parseFloat(req.body.price)
        };
        
        menuItems.push(newItem);
        await writeMenuItems(menuItems);
        
        res.status(201).json(newItem);
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ message: 'Failed to add menu item' });
    }
});

// Update menu item
router.put('/:id', async (req, res) => {
    try {
        const menuItems = await readMenuItems();
        const itemId = parseInt(req.params.id);
        const itemIndex = menuItems.findIndex(item => item.id === itemId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        
        const oldItem = menuItems[itemIndex];
        const newImagePath = req.body.image;
        
        // If image path changed, delete old image
        if (oldItem.image && oldItem.image !== newImagePath && oldItem.image.startsWith('/images/')) {
            deleteImageFile(oldItem.image);
        }
        
        menuItems[itemIndex] = {
            ...menuItems[itemIndex],
            ...req.body,
            id: itemId,
            price: parseFloat(req.body.price)
        };
        
        await writeMenuItems(menuItems);
        res.json(menuItems[itemIndex]);
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ message: 'Failed to update menu item' });
    }
});

// Delete menu item
router.delete('/:id', async (req, res) => {
    try {
        const menuItems = await readMenuItems();
        const itemId = parseInt(req.params.id);
        const itemToDelete = menuItems.find(item => item.id === itemId);
        
        if (!itemToDelete) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        
        // Delete the associated image file
        deleteImageFile(itemToDelete.image);
        
        const filteredItems = menuItems.filter(item => item.id !== itemId);
        await writeMenuItems(filteredItems);
        
        res.json({ message: 'Menu item and image deleted successfully' });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ message: 'Failed to delete menu item' });
    }
});

// Temporary route to reset menu items with updated spice levels
router.post('/reset-menu', async (req, res) => {
    try {
        // Clear existing menu items
        await MenuItem.deleteMany({});
        
        // Insert the new menu items with correct spice levels
        await MenuItem.insertMany(defaultMenuItems);
        
        res.json({ message: 'Menu reset successfully with updated spice levels' });
    } catch (error) {
        console.error('Error resetting menu:', error);
        res.status(500).json({ error: 'Failed to reset menu' });
    }
});

module.exports = router;