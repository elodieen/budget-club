import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Écran de migration temporaire — accessible uniquement en dev via l'URL http://localhost:xxxx/#migration
const isMigrationScreen = import.meta.env.DEV && window.location.hash === '#migration'
// Écran de test Supabase Auth — accessible uniquement en dev via l'URL http://localhost:xxxx/#auth-test
const isAuthTestScreen = import.meta.env.DEV && window.location.hash === '#auth-test'
// Futur écran de connexion — accessible uniquement en dev via l'URL http://localhost:xxxx/#login
const isLoginScreen = import.meta.env.DEV && window.location.hash === '#login'
// Écran de test lecture Supabase — accessible uniquement en dev via l'URL http://localhost:xxxx/#supabase-read-test
const isSupabaseReadTestScreen = import.meta.env.DEV && window.location.hash === '#supabase-read-test'

if (isMigrationScreen) {
  const { default: MigrationScreen } = await import('./MigrationScreen.jsx')
  ReactDOM.createRoot(document.getElementById('root')).render(<MigrationScreen />)
} else if (isAuthTestScreen) {
  const { default: AuthTestScreen } = await import('./AuthTestScreen.jsx')
  ReactDOM.createRoot(document.getElementById('root')).render(<AuthTestScreen />)
} else if (isLoginScreen) {
  const { default: LoginScreen } = await import('./LoginScreen.jsx')
  ReactDOM.createRoot(document.getElementById('root')).render(<LoginScreen />)
} else if (isSupabaseReadTestScreen) {
  const { default: SupabaseReadTestScreen } = await import('./SupabaseReadTestScreen.jsx')
  ReactDOM.createRoot(document.getElementById('root')).render(<SupabaseReadTestScreen />)
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(<App />)
}
