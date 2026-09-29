/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Enregistrement conditionnel du Service Worker en production (PWA)
if ('serviceWorker' in navigator && (import.meta.env?.PROD || process.env.NODE_ENV === 'production')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.info('[PWA] Service Worker actif (scope):', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Échec enregistrement Service Worker:', err);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("L'élément racine #root est introuvable dans le document DOM.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
