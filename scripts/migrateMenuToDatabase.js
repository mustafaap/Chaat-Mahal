require('dotenv').config();
const mongoose = require('mongoose');
const Menu = require('../models/Menu');
const fs = require('fs').promises;
const path = require('path');

const migrateMenu = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if menu items already exist
        const existingCount = await Menu.countDocuments();
        if (existingCount > 0) {
            console.log(`Found ${existingCount} existing menu items. Skipping migration.`);
            console.log('If you want to re-migrate, delete existing menu items first.');
            process.exit(0);
        }

        // Read existing menu.json
        const menuPath = path.join(__dirname, '..', 'data', 'menu.json');
        try {
            const menuData = await fs.readFile(menuPath, 'utf8');
            const menuItems = JSON.parse(menuData);

            // Insert menu items into database
            await Menu.insertMany(menuItems);
            console.log(`Migrated ${menuItems.length} menu items to database`);

            // Backup the JSON file
            const backupPath = path.join(__dirname, '..', 'data', `menu_backup_${Date.now()}.json`);
            await fs.copyFile(menuPath, backupPath);
            console.log(`Backup created at: ${backupPath}`);

        } catch (fileError) {
            console.log('No existing menu.json found. Creating default menu items...');
            
            // Create default menu items
            const defaultMenuItems = [
                {
                    id: 1,
                    name: 'Panipuri',
                    price: 3,
                    image: '/images/panipuri.JPG',
                    options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro'],
                    extraOptions: {},
                    category: 'Chaat',
                    description: 'Crispy shells filled with spiced water and chutneys',
                    noModal: false
                },
                {
                    id: 2,
                    name: 'Masala Puri',
                    price: 4,
                    image: '/images/masala-puri.JPG',
                    options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro'],
                    extraOptions: {},
                    category: 'Chaat',
                    description: 'Crispy puris topped with spiced potatoes and chutneys',
                    noModal: false
                },
                {
                    id: 3,
                    name: 'Dahipuri',
                    price: 6,
                    image: '/images/dahipuri.JPG',
                    options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro'],
                    extraOptions: {},
                    category: 'Chaat',
                    description: 'Puris filled with yogurt, chutneys and spices',
                    noModal: false
                },
                {
                    id: 4,
                    name: 'Sevpuri',
                    price: 6,
                    image: '/images/sevpuri.JPG',
                    options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro'],
                    extraOptions: {},
                    category: 'Chaat',
                    description: 'Crispy puris topped with sev, vegetables and chutneys',
                    noModal: false
                },
                {
                    id: 5,
                    name: 'Bhelpuri',
                    price: 7,
                    image: '/images/bhelpuri.JPG',
                    options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro'],
                    extraOptions: {},
                    category: 'Chaat',
                    description: 'Popular street snack with puffed rice and chutneys',
                    noModal: false
                },
                {
                    id: 6,
                    name: 'Paneer Wrap',
                    price: 8,
                    image: '/images/paneer-wrap.JPG',
                    options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro', 'Extra Paneer (+$2)'],
                    extraOptions: { 'Extra Paneer': 2 },
                    category: 'Wraps',
                    description: 'Grilled paneer with fresh vegetables wrapped in naan',
                    noModal: false
                },
                {
                    id: 7,
                    name: 'Chicken Wrap',
                    price: 9,
                    image: '/images/chicken-wrap.JPG',
                    options: ['No Spice', 'Regular', 'Extra Spicy', 'No Onions', 'No Cilantro', 'Extra Meat (+$2)'],
                    extraOptions: { 'Extra Meat': 2 },
                    category: 'Wraps',
                    description: 'Tender spiced chicken with vegetables wrapped in naan',
                    noModal: false
                },
                {
                    id: 8,
                    name: 'Mango Lassi',
                    price: 3,
                    image: '/images/mango-lassi.jpg',
                    options: [],
                    extraOptions: {},
                    category: 'Drinks',
                    description: 'Refreshing yogurt-based mango drink',
                    noModal: true
                },
                {
                    id: 9,
                    name: 'Water',
                    price: 1,
                    image: '/images/water.jpg',
                    options: ['Cold', 'Room Temperature'],
                    extraOptions: {},
                    category: 'Drinks',
                    description: 'Refreshing hydration',
                    noModal: false
                }
            ];

            await Menu.insertMany(defaultMenuItems);
            console.log(`Created ${defaultMenuItems.length} default menu items`);
        }

        mongoose.disconnect();
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateMenu();