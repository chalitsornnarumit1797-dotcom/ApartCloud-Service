import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// รันระบบ React เข้ากับตัวแปร root ใน index.html
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)