const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

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
    
    const cssContent = fs.readFileSync(path.join(__dirname, 'styles', 'emailService.css'), 'utf8');
    
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
                                const itemPrice = item.price ? item.price.toFixed(2) : '0.00';
                                const itemName = item.name || 'Unknown Item';
                                const itemOptions = item.options || [];
                                const quantity = item.quantity || 1;
                                
                                return `
                                    <tr>
                                        <td class="item-name-cell">
                                            <div class="item-name">${quantity > 1 ? `${quantity}x ` : ''}${itemName}</div>
                                            ${itemOptions.length > 0 ? `<div class="item-options">Options: ${itemOptions.join(', ')}</div>` : ''}
                                        </td>
                                        <td class="item-price-cell">
                                            $${itemPrice}${quantity > 1 ? ` each` : ''}
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