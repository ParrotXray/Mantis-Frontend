'use client'

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'

interface ErrorDialogProps {
  error: Error
  resetErrorBoundary: () => void
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({ error, resetErrorBoundary }) => {
  const handleClose = () => {
    window.location.href = '/'
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-2xl" />
          <h2 className="text-xl font-semibold text-gray-800">Oops! Something went wrong</h2>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-3">
            We encountered an unexpected error. Here are the details:
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <code className="text-red-700 text-sm break-all">
              {error ? error.toString() : 'Something went wrong'}
            </code>
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <button 
            onClick={handleClose}
            className="btn-secondary"
          >
            Go Home
          </button>
          <button 
            onClick={resetErrorBoundary}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
}

export default ErrorDialog