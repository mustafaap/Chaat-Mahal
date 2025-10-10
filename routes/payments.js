const express = require('express');
const router = express.Router();
const Stripe = require('stripe');

const stripeSecret = (process.env.STRIPE_SECRET_KEY || '').trim();
if (!stripeSecret) {
  console.error('Missing STRIPE_SECRET_KEY in .env');
}
const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

// Create a PaymentIntent and return clientSecret
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, currency = 'USD', customerName, customerEmail, orderItems } = req.body;

    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    if (!stripeSecret) {
      return res.status(500).json({ success: false, error: 'Payment system not configured' });
    }

    const intent = await stripe.paymentIntents.create({
      amount: Number(amount), // cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        customerName: customerName || '',
        orderItems: Array.isArray(orderItems) ? JSON.stringify(orderItems) : '',
      },
      receipt_email: customerEmail || undefined
    });

    res.json({
      success: true,
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id
    });
  } catch (error) {
    console.error('Stripe create-intent error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment intent'
    });
  }
});

// Simple credentials test
router.get('/test-credentials', async (req, res) => {
  try {
    if (!stripeSecret) {
      return res.status(500).json({ success: false, error: 'Missing STRIPE_SECRET_KEY' });
    }
    // A lightweight API call to validate key (list payment methods with 0 limit)
    await stripe.paymentMethods.list({ customer: 'no_such_customer', limit: 1 }).catch(() => null);
    res.json({ success: true, message: 'Stripe key looks valid' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Stripe key invalid' });
  }
});

module.exports = router;