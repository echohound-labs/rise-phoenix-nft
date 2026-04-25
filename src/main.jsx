// CRITICAL: Buffer polyfill must be the very first thing that runs.
// Solana libraries reference `Buffer` as a bare global at module evaluation time.
// The npm 'buffer' package is bundled by Vite but only available in module scope.
// We re-export it to globalThis so bare `Buffer` references work everywhere.
import { Buffer } from 'buffer'
window.Buffer = Buffer
globalThis.Buffer = Buffer

if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {}, browser: true, version: '', versions: {} }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Hide loading screen once React mounts
const loadingEl = document.getElementById('loading-screen')
if (loadingEl) loadingEl.style.display = 'none'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)