import './styles/KioskForm.css';
import './styles/OrderList.css';
import './styles/AdminControls.css';
import './styles/Navbar.css';
import './styles/Contact.css';
import './styles/About.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);