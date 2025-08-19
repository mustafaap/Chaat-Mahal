import React from 'react';
import '../styles/About.css';

const About = () => {
    return (
        <div className="about-container">
            <h1>About Chaat Mahal</h1>
            <div className="about-content">
                <div className="about-section">
                    <div className="about-text">
                        <h2>Our Story</h2>
                        <p>
                            Welcome to Chaat Mahal, Charlotte's premier destination for authentic Indian street food! 
                            Founded with a passion for bringing the vibrant flavors of India's bustling street markets 
                            to the heart of North Carolina, we serve up traditional chaats and wraps that transport 
                            your taste buds straight to the streets of Mumbai and Delhi.
                        </p>
                        <p>
                            Our food truck has been serving the Charlotte community since 2024, bringing together 
                            time-honored recipes passed down through generations with fresh, locally-sourced ingredients. 
                            Every dish is crafted with love and attention to authentic flavors that make Indian street 
                            food so beloved worldwide.
                        </p>
                    </div>
                    <div className="about-image">
                        <img src="/images/Chaat-Mahal.jpg" alt="Chaat Mahal Food Truck" />
                    </div>
                </div>

                <div className="menu-highlights">
                    <h2>What Makes Us Special</h2>
                    <div className="highlights-grid">
                        <div className="highlight-item">
                            <h3>🥘 Authentic Recipes</h3>
                            <p>Traditional recipes from the streets of India, perfected over generations</p>
                        </div>
                        <div className="highlight-item">
                            <h3>🌶️ Fresh Ingredients</h3>
                            <p>We use only the freshest spices and ingredients, sourced locally when possible</p>
                        </div>
                        <div className="highlight-item">
                            <h3>🚚 Mobile Convenience</h3>
                            <p>Find us located in Charlotte - follow us on social media for daily updates!</p>
                        </div>
                        <div className="highlight-item">
                            <h3>🎯 Made to Order</h3>
                            <p>Every dish is prepared fresh when you order, with customizable spice levels</p>
                        </div>
                    </div>
                </div>

                <div className="signature-dishes">
                    <h2>Our Signature Dishes</h2>
                    <div className="dishes-grid">
                        <div className="dish-card">
                            <img src="/images/panipuri.JPG" alt="Panipuri" />
                            <h3>Panipuri</h3>
                            <p>Crispy shells filled with spiced water, tamarind, and chutneys - a true street food classic!</p>
                        </div>
                        <div className="dish-card">
                            <img src="/images/bhelpuri.JPG" alt="Bhelpuri" />
                            <h3>Bhelpuri</h3>
                            <p>A delightful mix of puffed rice, sev, vegetables, and tangy chutneys</p>
                        </div>
                        <div className="dish-card">
                            <img src="/images/chicken-wrap.JPG" alt="Chicken Wrap" />
                            <h3>Chicken Wrap</h3>
                            <p>Tender spiced chicken wrapped in fresh naan with vegetables and our signature sauces</p>
                        </div>
                    </div>
                </div>

                <div className="mission-section">
                    <h2>Our Mission</h2>
                    <p>
                        At Chaat Mahal, we believe food is more than just sustenance - it's a bridge that connects 
                        cultures and creates community. Our mission is to share the joy, flavors, and traditions 
                        of Indian street food with Charlotte, one delicious bite at a time.
                    </p>
                    <p>
                        Whether you're already familiar with Indian cuisine or trying it for the first time, 
                        our friendly team is here to guide you through our menu and help you discover your new 
                        favorite flavors. We're not just serving food - we're sharing a piece of our heritage 
                        and passion with every customer.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default About;