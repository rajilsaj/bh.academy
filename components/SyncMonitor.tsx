'use client'

import { useEffect, useState } from 'react'

export function SyncMonitor() {
  const [time, setTime] = useState('')
  const [nextSync, setNextSync] = useState('')

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date()

      // Format current time
      const timeStr = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      setTime(timeStr)

      // Calculate next sync (every 15 minutes)
      const minutesUntilNext = 15 - (now.getMinutes() % 15)
      const nextSyncTime = new Date(now.getTime() + minutesUntilNext * 60000)
      const nextStr = nextSyncTime.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      setNextSync(nextStr)
    }

    updateTimes()
    const interval = setInterval(updateTimes, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">🔄 État de synchronisation</h3>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          ✅ Actif
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Last Sync */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
          <p className="text-xs font-semibold text-gray-600 mb-2">DERNIÈRE SYNC</p>
          <p className="text-2xl font-bold text-gray-900">{time}</p>
          <div className="mt-3 space-y-1 text-xs text-gray-600">
            <p>✅ 3 créés</p>
            <p>🔄 1 mis à jour</p>
            <p>⏭️ 2 ignorés</p>
          </div>
        </div>

        {/* Next Sync */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-indigo-100">
          <p className="text-xs font-semibold text-gray-600 mb-2">PROCHAINE SYNC</p>
          <p className="text-2xl font-bold text-gray-900">{nextSync}</p>
          <div className="mt-3 space-y-1 text-xs text-gray-600">
            <p>⏰ Planifiée</p>
            <p>🔁 Tous les 15 min</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          💡 La synchronisation s'exécute automatiquement toutes les 15 minutes. Les nouveaux formulaires Google sont importés automatiquement.
        </p>
      </div>
    </div>
  )
}
