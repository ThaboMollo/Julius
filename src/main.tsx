import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './app/ThemeContext'
import { AuthProvider } from './auth/AuthProvider'
import { ErrorBoundary } from './app/ErrorBoundary'
import { ToasterProvider } from './app/Toaster'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <ToasterProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToasterProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
