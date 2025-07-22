import React from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import KioskForm from './KioskForm';
import OrderList from './OrderList';

const App = () => {
  return (
    <Router>
      <div>
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#b85c38',
          padding: '12px 32px',
          marginBottom: 32,
        }}>
          {/* Logo and title on the left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <img
              src="/images/Chaat-Mahal.jpg"
              alt="Chaat Mahal Logo"
              style={{ height: 78, borderRadius: 8 }}
            />
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 32, marginLeft: 10 }}>
              Chaat Mahal Kiosk
            </span>
          </div>
          {/* Links on the right */}
          <div style={{ display: 'flex', gap: '30px' }}>
            <Link to="/" style={{ color: '#fff', fontWeight: 'bold', fontSize: 22, textDecoration: 'none' }}>
              Menu
            </Link>
            <Link to="/orders" style={{ color: '#fff', fontWeight: 'bold', fontSize: 22, textDecoration: 'none' }}>
              Orders
            </Link>
          </div>
        </nav>
        <Switch>
          <Route path="/" exact component={KioskForm} />
          <Route path="/orders" component={OrderList} />
        </Switch>
      </div>
    </Router>
  );
};

export default App;