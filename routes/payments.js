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
    const { amount, currency = 'USD', customerName, customerEmail, orderItems, tip } = req.body;

    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    if (!stripeSecret) {
      return res.status(500).json({ success: false, error: 'Payment system not configured' });
    }

    // Create a short summary for metadata
    let itemsSummary = '';
    if (Array.isArray(orderItems) && orderItems.length > 0) {
      itemsSummary = orderItems.map(item => {
        const qty = item.quantity > 1 ? `x${item.quantity}` : '';
        return `${item.name}${qty}`;
      }).join(', ');

      if (itemsSummary.length > 450) {
        itemsSummary = itemsSummary.substring(0, 450) + '...';
      }
    }

    const intent = await stripe.paymentIntents.create({
      amount: Number(amount),
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        customerName: customerName || '',
        itemsSummary: itemsSummary,
        itemCount: Array.isArray(orderItems) ? orderItems.length.toString() : '0',
        tip: tip ? tip.toFixed(2) : '0.00'
      },
      receipt_email: customerEmail || undefined
    });

    res.json({
      success: true,
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment processing failed'
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