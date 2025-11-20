'use client'

import { useEffect } from 'react'

/**
 * Composant pour gérer les erreurs globales et filtrer les erreurs des extensions Chrome
 */
export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Gestionnaire d'erreurs global pour filtrer les erreurs des extensions
    const handleError = (event: ErrorEvent) => {
      const filename = event.filename || ''
      const message = event.message || ''
      const error = event.error
      
      // Ignorer les erreurs provenant des extensions Chrome/Firefox/Safari
      if (
        filename.includes('chrome-extension://') ||
        filename.includes('moz-extension://') ||
        filename.includes('safari-extension://') ||
        filename.includes('contentScript.js') ||
        message.includes('chrome-extension://') ||
        message.includes('contentScript.js') ||
        message.includes('Cannot read properties of null') ||
        (error?.stack && (
          error.stack.includes('chrome-extension://') ||
          error.stack.includes('contentScript.js')
        ))
      ) {
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    // Gestionnaire pour les promesses rejetées non gérées
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const reasonString = reason?.toString() || ''
      const reasonStack = reason?.stack || ''
      
      // Ignorer les erreurs provenant des extensions
      if (
        reasonString.includes('chrome-extension://') ||
        reasonString.includes('contentScript.js') ||
        reasonString.includes('moz-extension://') ||
        reasonString.includes('Cannot read properties of null') ||
        reasonStack.includes('chrome-extension://') ||
        reasonStack.includes('contentScript.js')
      ) {
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    // Surcharger console.error pour filtrer les erreurs d'extensions
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      const errorString = args.join(' ')
      if (
        errorString.includes('chrome-extension://') ||
        errorString.includes('contentScript.js') ||
        errorString.includes('moz-extension://') ||
        (errorString.includes('Cannot read properties of null') && 
         errorString.includes('indexOf'))
      ) {
        // Ignorer ces erreurs
        return
      }
      originalConsoleError.apply(console, args)
    }

    window.addEventListener('error', handleError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true)

    return () => {
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
      console.error = originalConsoleError
    }
  }, [])

  return <>{children}</>
}

