'use client'

import { useState } from 'react'

interface SyncResult {
  success: boolean
  message: string
  duration?: string
  results?: {
    total: number
    created: number
    updated: number
    skipped: number
    errors: string[]
  }
  error?: string
}

export function SyncButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  const handleSync = async () => {
    setIsLoading(true)
    setShowResult(false)
    setResult(null)

    try {
      const response = await fetch('/admin/api/trigger-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      setResult(data)
      setShowResult(true)
    } catch (error) {
      setResult({
        success: false,
        message: 'Erreur de connexion',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      setShowResult(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Sync Button */}
      <button
        onClick={handleSync}
        disabled={isLoading}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-all ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-bo-bleu hover:bg-blue-700 active:scale-95'
        }`}
      >
        <svg
          className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 5.5a10 10 0 0 0-18.8 4.3" />
        </svg>
        {isLoading ? 'Synchronisation en cours...' : 'Synchroniser'}
      </button>

      {/* Result Display */}
      {showResult && result && (
        <div
          className={`rounded-lg border-2 p-6 animate-in fade-in slide-in-from-top-2 ${
            result.success
              ? 'border-green-300 bg-green-50'
              : 'border-red-300 bg-red-50'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`text-3xl ${result.success ? '✅' : '❌'}`}></span>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.success ? 'Synchronisation réussie' : 'Erreur de synchronisation'}
                </p>
                <p
                  className={`mt-1 text-xs ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {result.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowResult(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Details */}
          {result.results && (
            <div className="space-y-3 pt-4 border-t-2 border-current border-opacity-10">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-white bg-opacity-50 p-3">
                  <p className="text-xs font-medium text-gray-600">Total</p>
                  <p className={`mt-1 text-2xl font-bold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.results.total}
                  </p>
                </div>
                {result.results.created > 0 && (
                  <div className="rounded-lg bg-white bg-opacity-50 p-3">
                    <p className="text-xs font-medium text-gray-600">Ajoutés</p>
                    <p className="mt-1 text-2xl font-bold text-blue-700">
                      +{result.results.created}
                    </p>
                  </div>
                )}
                {result.results.updated > 0 && (
                  <div className="rounded-lg bg-white bg-opacity-50 p-3">
                    <p className="text-xs font-medium text-gray-600">Mis à jour</p>
                    <p className="mt-1 text-2xl font-bold text-purple-700">
                      ~{result.results.updated}
                    </p>
                  </div>
                )}
                {result.results.skipped > 0 && (
                  <div className="rounded-lg bg-white bg-opacity-50 p-3">
                    <p className="text-xs font-medium text-gray-600">Ignorés</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-700">
                      {result.results.skipped}
                    </p>
                  </div>
                )}
              </div>

              {/* Duration */}
              {result.duration && (
                <p className={`text-xs ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  ⏱️ Durée : {result.duration}
                </p>
              )}

              {/* Errors */}
              {result.results.errors.length > 0 && (
                <div className="mt-4 rounded bg-red-100 p-3">
                  <p className="text-xs font-semibold text-red-900 mb-2">
                    {result.results.errors.length} erreur{result.results.errors.length > 1 ? 's' : ''}
                  </p>
                  <ul className="space-y-1">
                    {result.results.errors.slice(0, 3).map((err, i) => (
                      <li key={i} className="text-xs text-red-800">
                        • {err}
                      </li>
                    ))}
                    {result.results.errors.length > 3 && (
                      <li className="text-xs text-red-800 italic">
                        ... et {result.results.errors.length - 3} erreur{result.results.errors.length - 3 > 1 ? 's' : ''} de plus
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
