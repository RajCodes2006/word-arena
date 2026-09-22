import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import NotFound from './NotFound';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {window.location.pathname === '/' ? <App /> : <NotFound />}
  </React.StrictMode>
);
