'use client'

import { useState } from 'react'

interface SyncResults {
  total: number
  created: number
  skipped: number
  errors: string[]
}

export function SyncLearnersButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SyncResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/admin/api/sync-learners', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Échec de la synchronisation')
        return
      }

      setResult(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la synchronisation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Simple Button */}
      <button
        onClick={handleSync}
        disabled={loading}
        className={`w-full rounded-lg px-4 py-3 font-semibold transition-all ${
          loading
            ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
            : 'bg-bo-bleu text-white hover:bg-bo-bleu/90 active:scale-95'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⟳</span>
            Synchronisation en cours...
          </span>
        ) : (
          '📥 Importer les apprenants'
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">⚠️ Erreur</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <p className="font-semibold">✅ Synchronisation réussie</p>
          <div className="mt-2 space-y-1 text-xs">
            <p>• <strong>{result.created}</strong> apprenants ajoutés</p>
            <p>• <strong>{result.skipped}</strong> doublons ignorés</p>
            {result.errors.length > 0 && (
              <p className="text-red-600">• <strong>{result.errors.length}</strong> erreurs</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
