import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch, Link, Redirect } from 'react-router-dom';
import KioskForm from './KioskForm';
import OrderList from './OrderList';
import Login from './Login';

const App = () => {
  const [loggedIn, setLoggedIn] = useState(false);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <img
              src="/images/Chaat-Mahal.jpg"
              alt="Chaat Mahal Logo"
              style={{ height: 78, borderRadius: 8 }}
            />
          </div>
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
          <Route path="/login">
            {loggedIn ? <Redirect to="/orders" /> : <Login onLogin={() => setLoggedIn(true)} />}
          </Route>
          <Route path="/orders">
            {loggedIn ? <OrderList /> : <Redirect to="/login" />}
          </Route>
          <Route path="/" exact>
            <KioskForm />
          </Route>
        </Switch>
      </div>
    </Router>
  );
};

export default App;