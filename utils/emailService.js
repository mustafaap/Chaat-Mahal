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

const generateOrderConfirmationEmailHTML = (orderData) => {
    const { customerName, orderNumber, items, total, tip = 0, paymentId } = orderData; // Add tip = 0
    
    // Calculate breakdown
    const subtotalWithTip = total - 0.35; // Remove convenience fee
    const taxAmount = subtotalWithTip / 1.0825 * 0.0825; // Calculate tax
    const subtotal = subtotalWithTip - taxAmount - tip; // Add - tip here
    const convenienceFee = 0.35;
    const totalWithTaxAndFee = total;
    
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
                    
                    <div class="pricing-breakdown" style="margin: 20px 0; padding: 15px; background: rgba(0, 0, 0, 0.02); border-radius: 8px; border-top: 2px solid rgba(184, 92, 56, 0.2);">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px dashed rgba(0, 0, 0, 0.1);">
                                <td style="padding: 8px 0; color: #666; font-weight: 500;">Subtotal:</td>
                                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">$${subtotal.toFixed(2)}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed rgba(0, 0, 0, 0.1);">
                                <td style="padding: 8px 0; color: #666; font-weight: 500;">Tax (8.25%):</td>
                                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">$${taxAmount.toFixed(2)}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed rgba(0, 0, 0, 0.1);">
                                <td style="padding: 8px 0; color: #666; font-weight: 500;">Convenience Fee:</td>
                                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">$${convenienceFee.toFixed(2)}</td>
                            </tr>
                            ${tip > 0 ? `
                            <tr style="border-bottom: 1px dashed rgba(0, 0, 0, 0.1);">
                                <td style="padding: 8px 0; color: #b85c38; font-weight: 600;">Tip:</td>
                                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #b85c38;">$${tip.toFixed(2)}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>
                    
                    <div class="total">
                        Total Paid: $${totalWithTaxAndFee.toFixed(2)}
                    </div>
                </div>
                
                <!-- Removed special instructions section -->
                
                <!-- Leave a Rating Section -->
                <div class="rating-section">
                    <h3>❤️ Loved your meal?</h3>
                    <p>Help us spread the word! Your review means the world to our business.</p>
                    <a href="https://www.google.com/maps/place/Chaat+Mahal/@35.3113509,-80.7489563,17z/data=!4m8!3m7!1s0x88541ddc5479ff77:0xcae7dbafe53489d9!8m2!3d35.3113509!4d-80.7489563!9m1!1b1!16s%2Fg%2F11y3_8h8qy?entry=ttu&g_ep=EgoyMDI1MDExNS4wIKXMDSoASAFQAw%3D%3D" target="_blank">
                       <div class="rating-button">
                        ⭐ Leave a Google Review
                    </a>
                    <p class="rating-subtitle">It only takes a minute and helps other food lovers find us!</p>
                </div>
                
                <div class="footer">
                    <p>
                        <strong>Chaat Mahal Food Truck</strong>
                    </p>
                    <p> 
                        <a href="https://maps.app.goo.gl/m8DxsdJ41BKaZVEU7">
                           📍 Parking lot, 9311 JW Clay Blvd, Charlotte, NC 28262
                        </a>
                    </p>
                    <p>📞 Phone: (704) 418-0330</p>
                    <p>✉️ Email: snackit@chaatmahal.com</p>
                    <p>Follow us on Instagram: <a href="https://www.instagram.com/the.chaat.mahal/">@the.chaat.mahal</a></p>
                    <p>This email was sent automatically. Please don't reply to this email.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};

const generateOrderReadyEmailHTML = (orderData) => {
    const { customerName, orderNumber } = orderData;
    
    const cssContent = fs.readFileSync(path.join(__dirname, 'styles', 'emailService.css'), 'utf8');
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Order Ready #${orderNumber}</title>
        <style>
            ${cssContent}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍛 Your Order is Ready!</h1>
                <p>Come pick up your delicious meal!</p>
            </div>
            
            <div class="content">
                <div class="order-number">Order #${orderNumber}</div>
                <div class="customer-name">Hi ${customerName}!</div>
                
                <div class="order-details">
                    <h3>🎉 Great News!</h3>
                    <p style="font-size: 1.1rem; text-align: center; margin: 20px 0;">
                        Your order is ready for pickup!
                    </p>
                    
                    // <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    //     <h4 style="color: #27ae60; margin: 0 0 10px 0;">📍 Pickup Location</h4>
                    //     <p style="margin: 5px 0; font-weight: 600;">Chaat Mahal Food Truck</p>
                    //     <p style="margin: 5px 0;">Parking lot, 9311 JW Clay Blvd</p>
                    //     <p style="margin: 5px 0;">Charlotte, NC 28262</p>
                    // </div>
                </div>
                
                <div class="total" style="background: #27ae60;">
                    Order Ready for Pickup! 🚗
                </div>
                
                <div class="rating-section">
                    <h3>📞 Questions?</h3>
                    <p>Call us at (704) 418-0330 if you have any questions or need directions!</p>
                </div>
                
                <div class="footer">
                    <p><strong>Chaat Mahal Food Truck</strong></p>
                    <p>📞 Phone: (704) 418-0330</p>
                    <p>✉️ Email: snackit@chaatmahal.com</p>
                    <p>Follow us on Instagram: <a href="https://www.instagram.com/the.chaat.mahal/">@the.chaat.mahal</a></p>
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
        const htmlContent = generateOrderConfirmationEmailHTML(orderData);
        
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

const sendOrderReadyEmail = async (customerEmail, orderData) => {
    if (!customerEmail || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('Email sending skipped - missing email or configuration');
        return { success: false, error: 'Email configuration missing' };
    }

    try {
        const transporter = createTransporter();
        const htmlContent = generateOrderReadyEmailHTML(orderData);
        
        const mailOptions = {
            from: `"Chaat Mahal Food Truck" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: `🍛 Order Ready for Pickup #${orderData.orderNumber} - Chaat Mahal`,
            html: htmlContent
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Order ready email sent successfully to:', customerEmail);
        console.log('Message ID:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Error sending order ready email:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendOrderConfirmationEmail,
    sendOrderReadyEmail
};