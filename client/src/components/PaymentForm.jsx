import React, { useState, useMemo, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import '../styles/PaymentForm.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

const CardCheckout = ({ orderTotal, onPaymentSuccess, onPaymentCancel, customerName, orderItems, onPayAtCounter }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const [walletUnavailableReason, setWalletUnavailableReason] = useState('');
  const [isCounterPaymentProcessing, setIsCounterPaymentProcessing] = useState(false);
  
  const [tipAmount, setTipAmount] = useState(1);
  const [customTip, setCustomTip] = useState('');
  const [selectedTipType, setSelectedTipType] = useState('fixed');

  const taxAmount = useMemo(() => orderTotal * 0.0825, [orderTotal]);
  const totalWithTax = useMemo(() => orderTotal + taxAmount + 0.35 + tipAmount, [orderTotal, taxAmount, tipAmount]);

  // Initialize Apple Pay / Google Pay
  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: 'Chaat Mahal Order',
        amount: Math.round(totalWithTax * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then(result => {
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
        setWalletUnavailableReason('');
      } else {
        setPaymentRequest(null);
        setCanMakePayment(false);
        setWalletUnavailableReason(
          'Digital wallet not available. Use Safari with Apple Pay set up or Chrome with a saved card and payments enabled.'
        );
      }
    });

    // Handle payment submission
    pr.on('paymentmethod', async (ev) => {
      setIsProcessing(true);
      setPaymentError('');

      try {
        // Use current totalWithTax at the time of payment
        const currentTotal = orderTotal + (orderTotal * 0.0825) + 0.35 + tipAmount;
        
        // 1) Create PaymentIntent on server
        const createRes = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(currentTotal * 100),
            currency: 'USD',
            customerName,
            orderItems,
            tip: tipAmount
          })
        });

        const { success, clientSecret, error } = await createRes.json();
        if (!success) {
          ev.complete('fail');
          setPaymentError(error || 'Failed to create payment');
          setIsProcessing(false);
          return;
        }

        // 2) Confirm payment with the payment method from Apple Pay/Google Pay
        const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmError) {
          ev.complete('fail');
          setPaymentError(confirmError.message);
          setIsProcessing(false);
          return;
        }

        if (paymentIntent.status === 'succeeded') {
          ev.complete('success');
          onPaymentSuccess(paymentIntent.id, tipAmount);
        } else {
          ev.complete('fail');
          setPaymentError('Payment not successful');
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Payment error:', error);
        ev.complete('fail');
        setPaymentError('An unexpected error occurred');
        setIsProcessing(false);
      }
    });
  }, [stripe, customerName, orderItems, onPaymentSuccess]); // Removed totalWithTax and tipAmount from dependencies

  // Update payment request when tip changes
  useEffect(() => {
    if (paymentRequest && totalWithTax) {
      paymentRequest.update({
        total: {
          label: 'Chaat Mahal Order',
          amount: Math.round(totalWithTax * 100),
        },
      });
    }
  }, [paymentRequest, totalWithTax, tipAmount]);

  const handleCardPayment = async () => {
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
          orderItems,
          tip: tipAmount
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
          billing_details: {
            name: customerName
          }
        }
      });

      if (confirmError) {
        setPaymentError(confirmError.message);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        onPaymentSuccess(paymentIntent.id, tipAmount);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError('An unexpected error occurred.');
      setIsProcessing(false);
    }
  };

  const handlePayAtCounter = async () => {
    if (isCounterPaymentProcessing) return;
    
    setIsCounterPaymentProcessing(true);
    try {
      await onPayAtCounter(tipAmount);
    } catch (error) {
      console.error('Counter payment error:', error);
      setIsCounterPaymentProcessing(false);
    }
  };

  const handleTipAmount = (amount) => {
    setTipAmount(amount);
    setSelectedTipType('fixed');
    setCustomTip('');
  };

  const handleCustomTip = (value) => {
    setCustomTip(value);
    const tip = parseFloat(value) || 0;
    setTipAmount(tip);
    setSelectedTipType(tip > 0 ? 'custom' : null);
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
        {tipAmount > 0 && (
          <div className="payment-summary-row tip-row">
            <span>Tip:</span>
            <span>${tipAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="payment-summary-row total-row">
          <span>Total:</span>
          <span>${totalWithTax.toFixed(2)}</span>
        </div>
      </div>

      {/* Tips Section */}
      <div className="tips-section">
        <h3 className="tips-label">Add a Tip? 💛</h3>
        <p className="tips-subtitle">Support our small business!</p>
        
        <div className="tip-buttons">
          <button
            type="button"
            className={`tip-btn ${selectedTipType === 'fixed' && tipAmount === 1 ? 'selected' : ''}`}
            onClick={() => handleTipAmount(1)}
          >
            $1
          </button>
          <button
            type="button"
            className={`tip-btn ${selectedTipType === 'fixed' && tipAmount === 2 ? 'selected' : ''}`}
            onClick={() => handleTipAmount(2)}
          >
            $2
          </button>
          <button
            type="button"
            className={`tip-btn ${selectedTipType === 'fixed' && tipAmount === 3 ? 'selected' : ''}`}
            onClick={() => handleTipAmount(3)}
          >
            $3
          </button>
          <button
            type="button"
            className={`tip-btn ${selectedTipType === 'none' ? 'selected' : ''}`}
            onClick={() => {
              setTipAmount(0);
              setCustomTip('');
              setSelectedTipType('none');
            }}
          >
            No Tip
          </button>
        </div>
        
        <div className="custom-tip-container">
          <label className="custom-tip-label">Custom Amount:</label>
          <div className="custom-tip-input-wrapper">
            <span className="currency-symbol">$</span>
            <input
              type="number"
              className="custom-tip-input"
              placeholder="0.00"
              value={customTip}
              onChange={(e) => handleCustomTip(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Apple Pay / Google Pay Button */}
      {canMakePayment && paymentRequest && (
        <div className="digital-wallet-section">
          <PaymentRequestButtonElement 
            options={{ 
              paymentRequest,
              style: {
                paymentRequestButton: {
                  type: 'default',
                  theme: 'dark',
                  height: '48px',
                }
              }
            }} 
          />
          <div className="payment-divider">
            <span>or pay with card</span>
          </div>
        </div>
      )}

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
            onClick={handleCardPayment}
            disabled={!stripe || !elements || isProcessing}
          >
            {isProcessing ? 'Processing...' : `Pay $${totalWithTax.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* Pay at Counter Option - Moved to bottom */}
      <div className="payment-option-section counter-payment-section">
        <div className="payment-divider">
          <span>or</span>
        </div>
        
        <button
          type="button"
          className="pay-at-counter-btn"
          onClick={handlePayAtCounter}
          disabled={isProcessing || isCounterPaymentProcessing} // Disable if either is processing
        >
          {isCounterPaymentProcessing ? 'Processing...' : '💵 Pay at Counter'}
        </button>
        <p className="pay-at-counter-note">
          Skip online payment and pay at the counter.<br />
          <span className="tax-disclaimer">Note: Final price after tax may vary slightly due to fees and tax regulations.</span>
        </p>
      </div>

      <div className="payment-security">
        <div className="security-badges">
          <span className="security-badge">🔒 Secure Payment</span>
          <span className="security-badge">💳 Stripe</span>
          {canMakePayment && <span className="security-badge">📱 Apple Pay</span>}
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