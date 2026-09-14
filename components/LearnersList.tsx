'use client'

import Link from 'next/link'
import { useState } from 'react'

export function LearnersList({
  items,
  tab
}: {
  items: any[]
  tab: string
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isValidating, setIsValidating] = useState(false)

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(items.map(i => i.id)))
    }
  }

  const toggle = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const handleBulkValidate = async () => {
    if (selected.size === 0) return

    setIsValidating(true)
    try {
      const response = await fetch('/admin/api/bulk-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selected),
          action: 'validate'
        }),
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Erreur lors de la validation')
      }
    } finally {
      setIsValidating(false)
    }
  }

  const handleBulkReject = async () => {
    if (selected.size === 0) return
    if (!confirm('Êtes-vous sûr de rejeter ces apprenants ?')) return

    setIsValidating(true)
    try {
      const response = await fetch('/admin/api/bulk-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selected),
          action: 'reject'
        }),
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Erreur lors du rejet')
      }
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-40 bg-blue-50 border-b-2 border-blue-200 p-4 flex items-center justify-between">
          <p className="font-semibold text-blue-900">
            {selected.size} apprenant{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            {tab === 'attente' && (
              <button
                onClick={handleBulkValidate}
                disabled={isValidating}
                className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                ✅ Approuver ({selected.size})
              </button>
            )}
            <button
              onClick={handleBulkReject}
              disabled={isValidating}
              className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              ❌ Rejeter ({selected.size})
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-slate-600">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <>
            {/* Header with Select All */}
            <div className="flex items-center gap-3 px-4 py-2 font-semibold text-gray-600">
              <input
                type="checkbox"
                checked={selected.size === items.length && items.length > 0}
                onChange={toggleAll}
                className="w-5 h-5 cursor-pointer"
              />
              <span>Sélectionner tout</span>
            </div>

            {/* Items */}
            {items.map((item: any) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${
                  selected.has(item.id)
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="w-5 h-5 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="font-semibold">{item.fullName || item.email}</p>
                  <p className="text-sm text-slate-600">{item.email}</p>
                  {item.phone && <p className="text-xs text-slate-500">📞 {item.phone}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.validatedAt ? (
                    <span className="text-xs font-semibold text-green-600">✅ Approuvé</span>
                  ) : (
                    <span className="text-xs font-semibold text-orange-600">⏳ Attente</span>
                  )}
                  <Link
                    href={`/admin/utilisateurs?fiche=${item.id}`}
                    className="rounded px-3 py-1 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    Voir
                  </Link>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}
