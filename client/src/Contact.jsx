import React from 'react';
import './styles/Contact.css';

const Contact = () => {
    return (
        <div className="contact-container">
            <h1>Contact Us</h1>
            <div className="contact-content">
                <div className="contact-info">
                    <h2>Chaat Mahal Food Truck</h2>
                    <div className="contact-item">
                        <h3>📍 Location</h3>
                        <p>We're a mobile food truck serving delicious Indian street food across Charlotte, NC</p>
                        <p>Follow us on social media for daily updates!</p>
                    </div>
                    <div className="contact-item">
                        <h3>📞 Phone</h3>
                        <p>(704) 123-4567</p>
                    </div>
                    <div className="contact-item">
                        <h3>✉️ Email</h3>
                        <p>info@chaatmahal.com</p>
                    </div>
                    <div className="contact-item">
                        <h3>🕐 Hours</h3>
                        <p>Monday - Friday: 11:00 AM - 8:00 PM</p>
                        <p>Saturday - Sunday: 12:00 PM - 9:00 PM</p>
                    </div>
                    <div className="contact-item">
                        <h3>📱 Follow Us</h3>
                        <p>Instagram: @chaatmahal_charlotte</p>
                        <p>Facebook: Chaat Mahal Charlotte</p>
                        <p>Twitter: @chaatmahal_clt</p>
                    </div>
                </div>
                <div className="contact-form">
                    <h2>Send us a Message</h2>
                    <form>
                        <input 
                            type="text" 
                            placeholder="Your Name" 
                            className="contact-input"
                            required
                        />
                        <input 
                            type="email" 
                            placeholder="Your Email" 
                            className="contact-input"
                            required
                        />
                        <input 
                            type="text" 
                            placeholder="Subject" 
                            className="contact-input"
                            required
                        />
                        <textarea 
                            placeholder="Your Message" 
                            className="contact-textarea"
                            rows="5"
                            required
                        />
                        <button type="submit" className="contact-submit">
                            Send Message
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Contact;