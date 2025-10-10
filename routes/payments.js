const express = require('express');
const router = express.Router();
const { SquareClient, SquareEnvironment } = require('square');

// Initialize Square client
console.log('Square configuration:', {
    accessToken: process.env.SQUARE_ACCESS_TOKEN ? `${process.env.SQUARE_ACCESS_TOKEN.substring(0, 10)}...` : 'MISSING',
    environment: process.env.SQUARE_ENVIRONMENT,
    locationId: process.env.SQUARE_LOCATION_ID
});

const squareClient = new SquareClient({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENVIRONMENT === 'production' 
        ? SquareEnvironment.Production 
        : SquareEnvironment.Sandbox,
});

// Process payment
router.post('/process', async (req, res) => {
    try {
        const { token, amount, currency, customerName, orderItems, paymentMethod } = req.body;

        console.log('Processing payment:', { 
            amount, 
            customerName, 
            currency, 
            paymentMethod: paymentMethod || 'card'
        });

        if (!token || !amount || !customerName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required payment information'
            });
        }

        // Skip credential testing and try payment directly
        console.log('Attempting payment with current credentials...');

        // FOR TESTING: Simulate successful payment without hitting Square API
        // Remove this block once Square credentials are working
        if (process.env.NODE_ENV === 'development' || token.includes('test')) {
            console.log('🧪 DEMO MODE: Simulating successful payment');
            
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            const demoResult = {
                success: true,
                paymentId: `demo_${Date.now()}`,
                orderId: `order_${Date.now()}`,
                amount: amount / 100,
                currency: currency,
                paymentMethod: paymentMethod || 'card',
                customer: customerName,
                timestamp: new Date().toISOString(),
                status: 'COMPLETED'
            };

            console.log('✅ Demo payment successful:', demoResult);
            return res.json(demoResult);
        }

        // Access payments API correctly
        const paymentsApi = squareClient.payments;
        
        const requestBody = {
            sourceId: token,
            amountMoney: {
                amount: BigInt(amount), // Amount in cents
                currency: currency || 'USD',
            },
            idempotencyKey: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            note: `Chaat Mahal Order - ${customerName}`,
            buyerEmailAddress: req.body.customerEmail, // If you want to include email
        };

        console.log('Sending payment request:', requestBody);

        const response = await paymentsApi.create(requestBody);

        if (response.result && response.result.payment) {
            const payment = response.result.payment;
            
            console.log('✅ Payment successful:', {
                paymentId: payment.id,
                amount: payment.amountMoney.amount,
                status: payment.status,
                customerName
            });

            res.json({
                success: true,
                paymentId: payment.id,
                status: payment.status,
                amount: payment.amountMoney.amount,
                message: 'Payment processed successfully'
            });
        } else {
            console.error('Payment failed:', response);
            res.status(400).json({
                success: false,
                error: 'Payment processing failed'
            });
        }
    } catch (error) {
        console.error('Payment error:', error);
        
        // Extract useful error information
        let errorMessage = 'Payment processing failed';
        if (error.result && error.result.errors && error.result.errors.length > 0) {
            errorMessage = error.result.errors[0].detail || errorMessage;
        }

        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

module.exports = router;