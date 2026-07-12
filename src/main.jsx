import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Écran de migration temporaire — accessible uniquement en dev via l'URL http://localhost:xxxx/#migration
const isMigrationScreen = import.meta.env.DEV && window.location.hash === '#migration'

if (isMigrationScreen) {
  const { default: MigrationScreen } = await import('./MigrationScreen.jsx')
  ReactDOM.createRoot(document.getElementById('root')).render(<MigrationScreen />)
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(<App />)
}
