'use client'

import { useState } from 'react'

interface SyncResults {
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export function SyncLearnersButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SyncResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/admin/api/sync-learners', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Sync failed')
        return
      }

      setResult(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleSync}
        disabled={loading}
        className="bo-bouton"
      >
        {loading ? 'Synchronisation...' : 'Synchroniser avec Google Forms'}
      </button>

      {error && (
        <div className="rounded-bloc bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Erreur</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="rounded-bloc bg-green-50 p-4 text-green-700">
          <p className="font-semibold">Synchronisation réussie!</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>✓ {result.created} apprenants créés</li>
            <li>• {result.total} lignes traitées</li>
            <li>• {result.skipped} ignorées (doublons)</li>
            {result.errors.length > 0 && (
              <li className="mt-2 text-red-600">
                {result.errors.length} erreurs
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
