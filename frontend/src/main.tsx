console.info('[wasel] build', new Date().toISOString().slice(0, 16))

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* progressive enhancement */
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

