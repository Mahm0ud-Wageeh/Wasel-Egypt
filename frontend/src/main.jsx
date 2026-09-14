import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { AuthProvider } from './auth/AuthContext'
import { LanguageProvider } from './i18n/LanguageContext'
import { AppErrorBoundary } from './components/ui/AppErrorBoundary'

import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/product.css'
import './styles/ai.css'

import { initGA } from './utils/analytics'

initGA()

// PWA: register the offline shell service worker (production + dev,
// so the installability can be demoed locally). Browsers ignore
// registration on unsupported schemes automatically.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline shell is a progressive enhancement — ignore failures */
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        {/* Skip link: first tab stop for keyboard users */}
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <AppErrorBoundary>
          <RouterProvider router={router} />
        </AppErrorBoundary>
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>
)
