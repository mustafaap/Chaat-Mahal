import React from 'react';
import '../styles/Contact.css';

const Contact = () => {
    return (
        <div className="contact-container">
            <h1>Contact Us</h1>
            <div className="contact-content">
                <div className="contact-info">
                    <h2>Chaat Mahal Food Truck</h2>
                    <div className="contact-item">
                        <h3>📍 Location</h3>
                        
                        {/* Google Maps Embed */}
                        <div className="map-container">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6511.567785575096!2d-80.74895632442566!3d35.31135087270895!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88541ddc5479ff77%3A0xcae7dbafe53489d9!2sChaat%20Mahal!5e0!3m2!1sen!2sus!4v1754897937213!5m2!1sen!2sus"
                                width="100%"
                                height="300"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Charlotte, NC Location"
                            ></iframe>
                        </div>
                        <br />
                        <p><strong>Address:</strong> Parking lot, 9311 JW Clay Blvd, Charlotte, NC 28262</p>
                    </div>
                    
                    {/* Contact Information Grid */}
                    <div className="contact-grid">
                        <div className="contact-item">
                            <h3>📞 Phone</h3>
                            <p>(704) 418-0330</p>
                        </div>
                        <div className="contact-item">
                            <h3>✉️ Email</h3>
                            <p>info@chaatmahal.com</p>
                        </div>
                        <div className="contact-item">
                            <h3>🕐 Hours</h3>
                            <p>Monday - Wednesday: Closed</p>
                            <p>Thursday - Sunday: 6:00 PM - 10:30 PM</p>
                        </div>
                        <div className="contact-item">
                            <h3>📱 Follow Us</h3>
                            <p>Instagram: @the.chaat.mahal</p>
                            <p>Facebook: Chaat Mahal Charlotte</p>
                            <p>Twitter: @chaatmahal_clt</p>
                        </div>
                    </div>
                </div>
                <div className="contact-form">
                    <h2>Send us a Message</h2>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        alert('Thank you for your message! We will get back to you soon.');
                    }}>
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
                    
                    {/* Logo Image */}
                    <div className="contact-logo">
                        <img 
                            src="/images/Chaat-Mahal.jpg" 
                            alt="Chaat Mahal Logo" 
                            className="contact-logo-image"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;