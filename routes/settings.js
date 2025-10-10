const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const settingsFilePath = path.join(__dirname, '..', 'data', 'settings.json');

// Ensure settings file exists with defaults
const ensureSettingsFile = async () => {
    try {
        await fs.access(settingsFilePath);
    } catch (error) {
        // File doesn't exist, create it with defaults
        const defaultSettings = {
            onlinePaymentEnabled: true
        };
        await fs.mkdir(path.dirname(settingsFilePath), { recursive: true });
        await fs.writeFile(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
    }
};

// GET current settings
router.get('/', async (req, res) => {
    try {
        await ensureSettingsFile();
        const settingsData = await fs.readFile(settingsFilePath, 'utf8');
        const settings = JSON.parse(settingsData);
        res.json(settings);
    } catch (error) {
        console.error('Error reading settings:', error);
        res.status(500).json({ message: 'Failed to read settings' });
    }
});

// UPDATE settings
router.patch('/', async (req, res) => {
    try {
        await ensureSettingsFile();
        const settingsData = await fs.readFile(settingsFilePath, 'utf8');
        const currentSettings = JSON.parse(settingsData);
        
        // Update only provided fields
        const updatedSettings = { ...currentSettings, ...req.body };
        
        await fs.writeFile(settingsFilePath, JSON.stringify(updatedSettings, null, 2));
        
        console.log('Settings updated:', updatedSettings);
        res.json({ success: true, settings: updatedSettings });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Failed to update settings' });
    }
});

module.exports = router;