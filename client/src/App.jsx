import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import KioskForm from './KioskForm';
import OrderList from './OrderList';
import Contact from './Contact';
import About from './About';
import './styles/Navbar.css';
import './styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>About Chaat Mahal</h3>
            <p>
              Charlotte's premier destination for authentic Indian street food. 
              We bring the vibrant flavors of India's bustling street markets 
              straight to your plate with fresh ingredients and traditional recipes.
            </p>
            <div className="social-links">
              <a href="#" className="social-link" title="Instagram">
                📷
              </a>
              <a href="#" className="social-link" title="Facebook">
                👥
              </a>
              <a href="#" className="social-link" title="Twitter">
                🐦
              </a>
            </div>
          </div>
          
          <div className="footer-section">
            <h3>Contact Info</h3>
            <ul className="footer-links">
              <li>
                <a href="tel:(704)123-4567">
                  <span className="icon">📞</span>
                  (704) 123-4567
                </a>
              </li>
              <li>
                <a href="mailto:info@chaatmahal.com">
                  <span className="icon">✉️</span>
                  info@chaatmahal.com
                </a>
              </li>
              <li>
                <a href="#">
                  <span className="icon">📍</span>
                  Mobile Food Truck - Charlotte, NC
                </a>
              </li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Hours</h3>
            <ul className="hours-list">
              <li>
                <span className="day">Monday - Friday</span>
                <span className="time">11:00 AM - 8:00 PM</span>
              </li>
              <li>
                <span className="day">Saturday</span>
                <span className="time">12:00 PM - 9:00 PM</span>
              </li>
              <li>
                <span className="day">Sunday</span>
                <span className="time">12:00 PM - 9:00 PM</span>
              </li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul className="footer-links">
              <li>
                <Link to="/">
                  <span className="icon">🍛</span>
                  Our Menu
                </Link>
              </li>
              <li>
                <Link to="/about">
                  <span className="icon">ℹ️</span>
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact">
                  <span className="icon">📧</span>
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <div className="footer-logo">
              <img src="/images/Chaat-Mahal.jpg" alt="Chaat Mahal" />
              <span className="footer-logo-text">Chaat Mahal</span>
            </div>
            <p className="copyright">
              © 2024 Chaat Mahal. All rights reserved. | Authentic Indian Street Food
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

const App = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <Router>
      <div>
        <nav className="navbar">
          <div className="nav-container">
            <div className="nav-logo">
              <Link to="/" onClick={closeMobileMenu}>
                <img
                  src="/images/Chaat-Mahal.jpg"
                  alt="Chaat Mahal Logo"
                  className="logo-image"
                />
              </Link>
            </div>
            
            {/* Mobile hamburger menu */}
            <div className={`hamburger ${mobileMenuOpen ? 'active' : ''}`} onClick={toggleMobileMenu}>
              <span></span>
              <span></span>
              <span></span>
            </div>

            {/* Navigation links - Added Orders link back */}
            <div className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
              <Link to="/" className="nav-link" onClick={closeMobileMenu}>
                Menu
              </Link>
              <Link to="/about" className="nav-link" onClick={closeMobileMenu}>
                About Us
              </Link>
              <Link to="/contact" className="nav-link" onClick={closeMobileMenu}>
                Contact
              </Link>
            </div>
          </div>
        </nav>

        <Switch>
          <Route path="/orders">
            <OrderList />
          </Route>
          <Route path="/about">
            <About />
          </Route>
          <Route path="/contact">
            <Contact />
          </Route>
          <Route path="/" exact>
            <KioskForm />
          </Route>
        </Switch>

        <Footer />
      </div>
    </Router>
  );
};

export default App;