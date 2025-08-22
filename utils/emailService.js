const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Read CSS file
const getCSSContent = () => {
    try {
        const cssPath = path.join(__dirname, 'styles', 'emailService.css'); // Added 'styles' folder
        return fs.readFileSync(cssPath, 'utf8');
    } catch (error) {
        console.warn('CSS file not found, using inline styles');
        return ''; // Fallback to inline styles if CSS file is missing
    }
};

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const generateOrderEmailHTML = (orderData) => {
    const { customerName, orderNumber, items, total, notes } = orderData;
    const cssContent = getCSSContent();
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Order Confirmation #${orderNumber}</title>
        <style>
            ${cssContent}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍛 Order Confirmation</h1>
                <p>Thank you for choosing Chaat Mahal!</p>
            </div>
            
            <div class="content">
                <div class="order-number">Order #${orderNumber}</div>
                <div class="customer-name">Customer: ${customerName}</div>
                
                <div class="order-details">
                    <h3>Items Ordered</h3>
                    <div class="items-list">
                        <table class="item-table">
                            ${Array.isArray(items) ? items.map(item => {
                                const itemName = typeof item === 'string' ? item : item.name;
                                const itemOptions = item.options && item.options.length > 0 ? item.options : [];
                                const itemPrice = item.price ? item.price.toFixed(2) : (total / items.length).toFixed(2);
                                
                                // Parse options from item string if it's a string
                                let displayName = itemName;
                                let displayOptions = itemOptions;
                                
                                if (typeof item === 'string' && item.includes('(')) {
                                    const parts = item.split(' (');
                                    displayName = parts[0];
                                    displayOptions = parts[1] ? [parts[1].replace(')', '')] : [];
                                }
                                
                                return `
                                    <tr>
                                        <td class="item-name-cell">
                                            <div class="item-name">${displayName}</div>
                                            ${displayOptions.length > 0 ? `<div class="item-options">Options: ${displayOptions.join(', ')}</div>` : ''}
                                        </td>
                                        <td class="item-price-cell">
                                            $${itemPrice}
                                        </td>
                                    </tr>
                                `;
                            }).join('') : '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #6c757d;">No items found</td></tr>'}
                        </table>
                    </div>
                    
                    <div class="total">
                        Total: $${total.toFixed(2)}
                    </div>
                </div>
                
                ${notes ? `
                    <div class="notes">
                        <strong>Special Instructions:</strong> ${notes}
                    </div>
                ` : ''}
                
                <div class="payment-notice">
                    <strong>Please pay at the counter to enter the order preparation line.</strong>
                </div>
                
                <div class="footer">
                    <p><strong>Chaat Mahal Food Truck</strong></p>
                    <p>📍 Parking lot, 9311 JW Clay Blvd, Charlotte, NC 28262</p>
                    <p>📞 Phone: (704) 418-0330</p>
                    <p>✉️ Email: snackit@chaatmahal.com</p>
                    <p>Follow us on Instagram: @the.chaat.mahal</p>
                    <p>This email was sent automatically. Please don't reply to this email.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};

const sendOrderConfirmationEmail = async (customerEmail, orderData) => {
    if (!customerEmail || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('Email sending skipped - missing email or configuration');
        return { success: false, error: 'Email configuration missing' };
    }

    try {
        const transporter = createTransporter();
        const htmlContent = generateOrderEmailHTML(orderData);
        
        const mailOptions = {
            from: `"Chaat Mahal Food Truck" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: `🍛 Order Confirmation #${orderData.orderNumber} - Chaat Mahal`,
            html: htmlContent
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully to:', customerEmail);
        console.log('Message ID:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendOrderConfirmationEmail
};