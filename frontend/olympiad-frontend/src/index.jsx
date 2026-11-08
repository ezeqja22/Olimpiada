import axios from "axios";
// Bound stalled reads without shortening existing upload/write timeouts.
axios.interceptors.request.use(config => {
  if ((!config.method || config.method.toLowerCase() === "get") && !config.timeout) config.timeout = 15000;
  return config;
});
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
