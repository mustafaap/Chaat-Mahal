const express = require('express');
const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password required' });
    }

    const ownerPassword = process.env.ADMIN_OWNER_PASSWORD;
    const employeePassword = process.env.ADMIN_EMPLOYEE_PASSWORD;

    if (password === ownerPassword) {
        return res.json({ role: 'owner' });
    } else if (password === employeePassword) {
        return res.json({ role: 'employee' });
    } else {
        return res.status(401).json({ error: 'Incorrect password' });
    }
});

module.exports = router;
