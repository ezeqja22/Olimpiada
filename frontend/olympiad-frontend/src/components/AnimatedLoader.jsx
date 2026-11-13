import React from 'react';
import './AnimatedLoader.css';

export default function AnimatedLoader({ message = 'Loading…', size = 'large' }) {
  return <div className={`ol-loader ol-loader--${size}`} role="status" aria-live="polite">
    <span className="ol-loader__track" aria-hidden="true"><span /></span>
    <p>{message}</p>
  </div>;
}
