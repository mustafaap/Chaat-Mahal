import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Link, useLocation } from 'react-router-dom';
import KioskForm from './components/KioskForm';
import OrderList from './components/OrderList';
import AdminControls from './components/AdminControls';
import AdminLogin from './components/AdminLogin';
import Contact from './components/Contact';
import About from './components/About';
import './styles/Navbar.css';
import './styles/Footer.css';

// Add ScrollToTop component
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

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
          </div>
          
          <div className="footer-section">
            <h3>Contact Info</h3>
            <ul className="footer-links">
              <li>
                <a href="tel:(704)418-0330">
                  <span className="icon">📞</span>
                  (704) 418-0330
                </a>
              </li>
              <li>
                <a href="mailto:snackit@chaatmahal.com">
                  <span className="icon">✉️</span>
                  snackit@chaatmahal.com
                </a>
              </li>
              <li>
                <a href="https://instagram.com/the.chaat.mahal" target="_blank" rel="noopener noreferrer">
                  <span className="icon">📷</span>
                  @the.chaat.mahal
                </a>
              </li>
              <li>
                <a href="https://maps.app.goo.gl/2weXbPgSvs6NtCeM6" target="_blank" rel="noopener noreferrer">
                  <span className="icon">📍</span>
                  Parking lot, 9311 JW Clay Blvd, Charlotte, NC 28262
                </a>
              </li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Hours</h3>
            <ul className="hours-list">
              <li>
                <span className="day">Monday - Wednesday</span>
                <span className="time">Closed</span>
              </li>
              <li>
                <span className="day">Thursday - Sunday</span>
                <span className="time">6:00 PM - 10:30 PM</span>
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

// Customer Navbar Component
const CustomerNavbar = ({ mobileMenuOpen, toggleMobileMenu, closeMobileMenu }) => {
  const location = useLocation();
  
  const handleMenuClick = () => {
    if (location.pathname === '/') {
      // If we're already on the home page, reset the kiosk form
      window.location.reload();
    } else {
      // If we're on a different page, navigate to home
      // ScrollToTop component will handle the scroll
    }
    closeMobileMenu();
  };

  const handleNavLinkClick = () => {
    closeMobileMenu();
    // Let the ScrollToTop component handle scrolling
  };

  return (
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

        {/* Customer Navigation links */}
        <div className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link" onClick={handleMenuClick}>
            Menu
          </Link>
          <Link to="/about" className="nav-link" onClick={handleNavLinkClick}>
            About Us
          </Link>
          <Link to="/contact" className="nav-link" onClick={handleNavLinkClick}>
            Contact
          </Link>
        </div>
      </div>
    </nav>
  );
};

// Admin Navbar Component - Updated with Controls tab
const AdminNavbar = ({ mobileMenuOpen, toggleMobileMenu, closeMobileMenu, currentView, setCurrentView }) => {
  return (
    <nav className="navbar admin-navbar">
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
        
        <div className={`hamburger ${mobileMenuOpen ? 'active' : ''}`} onClick={toggleMobileMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className={`nav-menu admin-nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <button 
            className={`nav-link admin-nav-btn ${currentView === 'pending' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('pending');
              closeMobileMenu();
            }}
          >
            Pending Orders
          </button>
          <button 
            className={`nav-link admin-nav-btn ${currentView === 'completed' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('completed');
              closeMobileMenu();
            }}
          >
            Completed Orders
          </button>
          <button 
            className={`nav-link admin-nav-btn ${currentView === 'cancelled' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('cancelled');
              closeMobileMenu();
            }}
          >
            Cancelled Orders
          </button>
          <button 
            className={`nav-link admin-nav-btn ${currentView === 'controls' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('controls');
              closeMobileMenu();
            }}
          >
            Controls
          </button>
          <Link to="/" className="nav-link back-to-menu" onClick={closeMobileMenu}>
            Back to Menu
          </Link>
        </div>
      </div>
    </nav>
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
      <AppContent 
        mobileMenuOpen={mobileMenuOpen}
        toggleMobileMenu={toggleMobileMenu}
        closeMobileMenu={closeMobileMenu}
      />
    </Router>
  );
};

const AppContent = ({ mobileMenuOpen, toggleMobileMenu, closeMobileMenu }) => {
  const location = useLocation();
  const isAdminPage = location.pathname === '/orders';

  return (
    <div>
      <ScrollToTop />
      {isAdminPage ? (
        <AdminOrdersPage 
          mobileMenuOpen={mobileMenuOpen}
          toggleMobileMenu={toggleMobileMenu}
          closeMobileMenu={closeMobileMenu}
        />
      ) : (
        <>
          <CustomerNavbar 
            mobileMenuOpen={mobileMenuOpen}
            toggleMobileMenu={toggleMobileMenu}
            closeMobileMenu={closeMobileMenu}
          />
          
          <Switch>
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
        </>
      )}
    </div>
  );
};

// Update the AdminOrdersPage component to include authentication
const AdminOrdersPage = ({ mobileMenuOpen, toggleMobileMenu, closeMobileMenu }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    const savedView = localStorage.getItem('adminCurrentView');
    return savedView || 'pending';
  });

  // Check authentication on component mount
  useEffect(() => {
    const authStatus = localStorage.getItem('adminAuthenticated');
    setIsAuthenticated(authStatus === 'true');
  }, []);

  // Save to localStorage whenever currentView changes
  useEffect(() => {
    localStorage.setItem('adminCurrentView', currentView);
  }, [currentView]);

  // Reset AdminControls view when leaving controls section
  useEffect(() => {
    if (currentView !== 'controls') {
      localStorage.setItem('adminControlsView', 'dashboard');
    }
  }, [currentView]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const renderCurrentView = () => {
    switch(currentView) {
      case 'controls':
        return <AdminControls />;
      case 'pending':
      case 'completed':
      case 'cancelled':
      default:
        return <OrderList currentView={currentView} setCurrentView={setCurrentView} />;
    }
  };

  return (
    <>
      <AdminNavbar 
        mobileMenuOpen={mobileMenuOpen}
        toggleMobileMenu={toggleMobileMenu}
        closeMobileMenu={closeMobileMenu}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
      {renderCurrentView()}
    </>
  );
};

export default App;