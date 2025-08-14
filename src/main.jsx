import React from 'react';
import ReactDOM from 'react-dom/client';
import YoutubeDownloader from './App';
import './index.css';

// Find the root DOM element
const rootElement = document.getElementById('root');

// Create a React root and render the application
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <YoutubeDownloader />
  </React.StrictMode>
);
