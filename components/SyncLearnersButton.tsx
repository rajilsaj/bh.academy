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
    <div className="w-full space-y-2">
      {/* Simple Button */}
      <button
        onClick={handleSync}
        disabled={loading}
        className={`w-full whitespace-nowrap rounded-lg px-4 py-2.5 font-semibold transition-all ${
          loading
            ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
            : 'bg-bo-bleu text-white hover:bg-bo-bleu/90 active:scale-95'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin text-lg">⟳</span>
            Sync...
          </span>
        ) : (
          'Synchroniser'
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          <p className="font-semibold">⚠️ {error}</p>
        </div>
      )}

      {/* Success Message */}
      {result && (
        <div className="rounded border border-green-200 bg-green-50 p-2 text-xs text-green-700">
          <p className="font-semibold">✅ {result.created} ajoutés</p>
        </div>
      )}
    </div>
  )
}
