import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import KioskForm from './KioskForm';
import OrderList from './OrderList';

const App = () => {
  return (
    <Router>
      <div>
        <h1>Chaat Mahal Kiosk</h1>
        <Switch>
          <Route path="/" exact component={KioskForm} />
          <Route path="/orders" component={OrderList} />
        </Switch>
      </div>
    </Router>
  );
};

export default App;