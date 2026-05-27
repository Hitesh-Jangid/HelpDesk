import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const ghPagesRedirect = sessionStorage.getItem('gh-pages-redirect')

if (ghPagesRedirect) {
  sessionStorage.removeItem('gh-pages-redirect')
  window.history.replaceState(null, '', ghPagesRedirect)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
