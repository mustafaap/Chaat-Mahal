import React, { useState, useEffect } from 'react';
import '../styles/PaymentForm.css';

const PaymentForm = ({ orderTotal, onPaymentSuccess, onPaymentCancel, customerName, orderItems }) => {
    const [card, setCard] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [isSquareLoaded, setIsSquareLoaded] = useState(false);

    useEffect(() => {
        let cardElement = null;
        
        const initializeSquare = async () => {
            try {
                // Clear any existing content in the card container
                const cardContainer = document.getElementById('card-container');
                if (cardContainer) {
                    // Remove any existing Square elements
                    const existingWrappers = cardContainer.querySelectorAll('.sq-card-wrapper');
                    existingWrappers.forEach(wrapper => wrapper.remove());
                }
                
                // Add debug logging
                console.log('Checking Square availability...');
                console.log('Environment variables:', {
                    appId: process.env.REACT_APP_SQUARE_APPLICATION_ID,
                    locationId: process.env.REACT_APP_SQUARE_LOCATION_ID,
                    environment: process.env.REACT_APP_SQUARE_ENVIRONMENT
                });
                
                if (!window.Square) {
                    console.error('Square Web SDK not loaded');
                    setPaymentError('Square payment system not available. Please refresh the page.');
                    return;
                }

                console.log('Square object available:', window.Square);

                const payments = window.Square.payments(
                    process.env.REACT_APP_SQUARE_APPLICATION_ID,
                    process.env.REACT_APP_SQUARE_LOCATION_ID
                );

                cardElement = await payments.card({
                    style: {
                        '.input-container': {
                            borderColor: '#b85c38',
                            borderRadius: '8px'
                        },
                        '.input-container.is-focus': {
                            borderColor: '#a14d2c'
                        },
                        '.input-container.is-error': {
                            borderColor: '#e74c3c'
                        },
                        '.message-text': {
                            color: '#e74c3c'
                        }
                    }
                });

                await cardElement.attach('#card-container');
                setCard(cardElement);
                setIsSquareLoaded(true);
                setPaymentError(''); // Clear any previous errors
                console.log('Square payment form loaded successfully');
            } catch (error) {
                console.error('Error initializing Square:', error);
                setPaymentError(`Failed to load payment form: ${error.message}. Please refresh and try again.`);
            }
        };

        // Add a small delay to ensure DOM is ready
        const timer = setTimeout(initializeSquare, 100);

        return () => {
            clearTimeout(timer);
            if (cardElement) {
                try {
                    cardElement.destroy();
                } catch (e) {
                    console.warn('Error destroying card element:', e);
                }
            }
            // Clean up any remaining Square elements
            const cardContainer = document.getElementById('card-container');
            if (cardContainer) {
                const existingWrappers = cardContainer.querySelectorAll('.sq-card-wrapper');
                existingWrappers.forEach(wrapper => wrapper.remove());
            }
        };
    }, []);

    const handlePayment = async () => {
        if (!card) {
            setPaymentError('Payment form not ready. Please wait.');
            return;
        }

        setIsProcessing(true);
        setPaymentError('');

        try {
            const result = await card.tokenize();
            
            if (result.status === 'OK') {
                const paymentData = {
                    token: result.token,
                    amount: Math.round(orderTotal * 100), // Convert to cents
                    currency: 'USD',
                    customerName,
                    orderItems
                };

                const response = await fetch('/api/payments/process', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(paymentData),
                });

                const paymentResult = await response.json();

                if (paymentResult.success) {
                    onPaymentSuccess(paymentResult.paymentId);
                } else {
                    setPaymentError(paymentResult.error || 'Payment failed. Please try again.');
                }
            } else {
                setPaymentError('Invalid card information. Please check and try again.');
            }
        } catch (error) {
            console.error('Payment error:', error);
            setPaymentError('Payment processing failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const taxAmount = orderTotal * 0.08; // 8% tax
    const totalWithTax = orderTotal + taxAmount;

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
                    <span>Tax (8%):</span>
                    <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="payment-summary-row total-row">
                    <span>Total:</span>
                    <span>${totalWithTax.toFixed(2)}</span>
                </div>
            </div>

                <div className="payment-form">
                <label className="payment-label">Card Information</label>
                <div id="card-container" className="payment-card-container" key="payment-card-container">
                    {!isSquareLoaded && !paymentError && (
                        <div className="payment-loading">
                            <div className="payment-spinner"></div>
                            <span>Loading payment form...</span>
                        </div>
                    )}
                </div>

                {paymentError && (
                    <div className="payment-error">
                        {paymentError}
                    </div>
                )}

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
                        disabled={!isSquareLoaded || isProcessing}
                    >
                        {isProcessing ? 'Processing...' : `Pay $${totalWithTax.toFixed(2)}`}
                    </button>
                </div>
            </div>

            <div className="payment-security">
                <div className="security-badges">
                    <span className="security-badge">🔒 Secure Payment</span>
                    <span className="security-badge">💳 Square</span>
                </div>
                <p className="security-text">
                    Your payment information is encrypted and secure. We never store your card details.
                </p>
            </div>
        </div>
    );
};

export default PaymentForm;