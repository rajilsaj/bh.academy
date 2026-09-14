'use client'

import { useEffect, useState } from 'react'

interface SyncEvent {
  timestamp: Date
  status: 'running' | 'success' | 'error'
  message: string
  count?: { created: number; updated: number; skipped: number }
}

export function SyncMonitor() {
  const [lastSync, setLastSync] = useState<SyncEvent | null>(null)
  const [nextSync, setNextSync] = useState<Date | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    // Simulate cron schedule every 15 minutes
    const calculateNextSync = () => {
      const now = new Date()
      const minutesUntilNext = 15 - (now.getMinutes() % 15)
      return new Date(now.getTime() + minutesUntilNext * 60000)
    }

    // Check for last sync in localStorage (updated by API)
    const checkLastSync = () => {
      const stored = localStorage.getItem('lastSyncEvent')
      if (stored) {
        const event = JSON.parse(stored)
        event.timestamp = new Date(event.timestamp)
        setLastSync(event)
      }
      setNextSync(calculateNextSync())
    }

    checkLastSync()

    // Poll every minute to update times
    const interval = setInterval(() => {
      checkLastSync()
    }, 60000)

    // Listen for manual sync trigger
    const handleSync = (e: CustomEvent) => {
      setIsRunning(true)
      const event: SyncEvent = {
        timestamp: new Date(),
        status: 'running',
        message: '⏳ Synchronisation en cours...',
      }
      setLastSync(event)

      setTimeout(() => {
        setIsRunning(false)
      }, 3000)
    }

    window.addEventListener('syncTriggered' as any, handleSync)

    return () => {
      clearInterval(interval)
      window.removeEventListener('syncTriggered' as any, handleSync)
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="ds-card bg-gradient-to-r from-indigo-50 to-purple-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">🔄 État de synchronisation</h3>
          {isRunning && (
            <div className="flex items-center gap-2">
              <div className="animate-spin">⏳</div>
              <span className="text-sm font-semibold text-blue-600">En cours...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Last Sync */}
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <p className="text-xs font-semibold text-gray-600 mb-1">DERNIÈRE SYNC</p>
            {lastSync ? (
              <>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(lastSync.timestamp)}
                </p>
                <p className="text-xs text-gray-600 mt-1">{formatDate(lastSync.timestamp)}</p>
                <div className={`mt-3 inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(lastSync.status)}`}>
                  {lastSync.status === 'running' && '⏳ En cours'}
                  {lastSync.status === 'success' && '✅ Succès'}
                  {lastSync.status === 'error' && '❌ Erreur'}
                </div>
                {lastSync.count && (
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <p>➕ {lastSync.count.created} créés</p>
                    <p>🔄 {lastSync.count.updated} mis à jour</p>
                    <p>⏭️ {lastSync.count.skipped} ignorés</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500">Aucune sync pour l'instant</p>
            )}
          </div>

          {/* Next Sync */}
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <p className="text-xs font-semibold text-gray-600 mb-1">PROCHAINE SYNC</p>
            {nextSync ? (
              <>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(nextSync)}
                </p>
                <p className="text-xs text-gray-600 mt-1">{formatDate(nextSync)}</p>
                <div className="mt-3 inline-block px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
                  ⏰ Planifiée
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Tous les 15 minutes
                </p>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-indigo-100">
          <p className="text-xs text-gray-600">
            💡 La synchronisation s'exécute automatiquement toutes les 15 minutes. Les nouveaux formulaires Google sont importés automatiquement.
          </p>
        </div>
      </div>
    </div>
  )
}
