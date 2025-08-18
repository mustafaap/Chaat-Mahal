const fs = require('fs').promises;
const path = require('path');

const counterFilePath = path.join(__dirname, '..', 'data', 'orderCounter.json');

// Ensure data directory exists
const ensureDataDirectory = async () => {
    const dataDir = path.dirname(counterFilePath);
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
};

// Get current date as string (YYYY-MM-DD)
const getCurrentDateString = () => {
    return new Date().toISOString().split('T')[0];
};

// Read counter data
const readCounterData = async () => {
    try {
        await ensureDataDirectory();
        const data = await fs.readFile(counterFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return default
        return {
            date: getCurrentDateString(),
            counter: 0
        };
    }
};

// Write counter data
const writeCounterData = async (data) => {
    await ensureDataDirectory();
    await fs.writeFile(counterFilePath, JSON.stringify(data, null, 2));
};

// Get next order number
const getNextOrderNumber = async () => {
    const currentDate = getCurrentDateString();
    const counterData = await readCounterData();
    
    // If date has changed, reset counter to 1
    if (counterData.date !== currentDate) {
        counterData.date = currentDate;
        counterData.counter = 1;
    } else {
        // Increment counter for same day
        counterData.counter += 1;
    }
    
    // Save updated counter
    await writeCounterData(counterData);
    
    return counterData.counter;
};

module.exports = {
    getNextOrderNumber
};