
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeSecurityHeaders } from '@/middleware/securityHeaders'

// Initialize security headers
initializeSecurityHeaders();

// Add DOMPurify configuration
import DOMPurify from 'dompurify';
DOMPurify.setConfig({
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span'],
  ALLOWED_ATTR: ['class', 'id'],
  KEEP_CONTENT: true
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
