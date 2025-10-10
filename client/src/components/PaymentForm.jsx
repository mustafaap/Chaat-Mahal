import React, { useState, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import '../styles/PaymentForm.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

const CardCheckout = ({ orderTotal, onPaymentSuccess, onPaymentCancel, customerName, orderItems }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const taxAmount = useMemo(() => orderTotal * 0.0825, [orderTotal]); // 8.25% tax
  const totalWithTax = useMemo(() => orderTotal + taxAmount + 0.35, [orderTotal, taxAmount]);

  const handlePayment = async () => {
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setPaymentError('');

    try {
      // 1) Create PaymentIntent on server
      const createRes = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(totalWithTax * 100),
          currency: 'USD',
          customerName,
          orderItems
        })
      });
      const { success, clientSecret, error } = await createRes.json();
      if (!success) {
        setPaymentError(error || 'Failed to start payment');
        setIsProcessing(false);
        return;
      }

      // 2) Confirm card payment with Elements
      const card = elements.getElement(CardElement);
      const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: { name: customerName || 'Guest' }
        }
      });

      if (confirmError) {
        setPaymentError(confirmError.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture')) {
        onPaymentSuccess(paymentIntent.id);
      } else {
        setPaymentError(`Payment status: ${paymentIntent?.status || 'unknown'}`);
      }
    } catch (e) {
      console.error('Stripe payment error:', e);
      setPaymentError('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="payment-container">
      <div className="payment-header">
        <h2>Payment</h2>
        <p>Complete your order with secure payment</p>
      </div>

      <div className="payment-summary">
        <div className="payment-summary-row">
          <span>Subtotal:</span>
          <span>${orderTotal.toFixed(2)}</span>
        </div>
        <div className="payment-summary-row">
          <span>Tax (8.25%):</span>
          <span>${taxAmount.toFixed(2)}</span>
        </div>
        <div className="payment-summary-row">
          <span>Convenience Fee:</span>
          <span>$0.35</span>
        </div>
        <div className="payment-summary-row total-row">
          <span>Total:</span>
          <span>${totalWithTax.toFixed(2)}</span>
        </div>
      </div>

      <div className="payment-form">
        <label className="payment-label">Card Information</label>
        <div className="payment-card-container">
          <CardElement options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#32325d',
                '::placeholder': { color: '#a0aec0' }
              },
              invalid: { color: '#e74c3c' }
            }
          }} />
        </div>

        {paymentError && <div className="payment-error">{paymentError}</div>}

        <div className="payment-actions">
          <button
            type="button"
            className="payment-cancel-btn"
            onClick={onPaymentCancel}
            disabled={isProcessing}
          >
            Back to Order
          </button>
          <button
            type="button"
            className="payment-submit-btn"
            onClick={handlePayment}
            disabled={!stripe || !elements || isProcessing}
          >
            {isProcessing ? 'Processing...' : `Pay $${totalWithTax.toFixed(2)}`}
          </button>
        </div>
      </div>

      <div className="payment-security">
        <div className="security-badges">
          <span className="security-badge">🔒 Secure Payment</span>
          <span className="security-badge">💳 Stripe</span>
        </div>
        <p className="security-text">
          Your payment information is encrypted and secure. We never store your card details.
        </p>
      </div>
    </div>
  );
};

const PaymentForm = (props) => {
  if (!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
    return <div className="payment-error">Payment configuration error. Please contact support.</div>;
  }

  return (
    <Elements stripe={stripePromise}>
      <CardCheckout {...props} />
    </Elements>
  );
};

export default PaymentForm;