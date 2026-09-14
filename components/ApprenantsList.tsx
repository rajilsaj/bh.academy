'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ApprenantModal } from './ApprenantModal'

export interface Apprenant {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  city: string | null
  status: string | null
  gender: string | null
  dateOfBirth: string | null
  validatedAt: Date | null
  createdAt: Date
  formSubmittedAt: Date | null
  cohortId: string
  consentCommunity: boolean
  consentData: boolean
  cvUrl: string | null
  idDocumentUrl: string | null
}

export function ApprenantsList({ initialData }: { initialData: any[] }) {
  const apprenants: Apprenant[] = initialData.map((item) => ({
    id: item.learners.id,
    fullName: item.learners.fullName,
    email: item.learners.email,
    phone: item.learners.phone,
    city: item.learners.city,
    status: item.learners.status,
    gender: item.learners.gender,
    dateOfBirth: item.learners.dateOfBirth,
    validatedAt: item.learners.validatedAt,
    createdAt: item.learners.createdAt,
    formSubmittedAt: item.learners.formSubmittedAt,
    cohortId: item.learners.cohortId,
    consentCommunity: item.learners.consentCommunity,
    consentData: item.learners.consentData,
    cvUrl: item.learners.cvUrl,
    idDocumentUrl: item.learners.idDocumentUrl,
  }))

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedApprenant, setSelectedApprenant] = useState<Apprenant | null>(null)
  const checkboxRef = useRef<HTMLInputElement>(null)

  const filteredApprenants = useMemo(() => {
    if (!searchQuery.trim()) return apprenants

    const query = searchQuery.toLowerCase()
    return apprenants.filter((apprenant) => {
      return (
        apprenant.id.toLowerCase().includes(query) ||
        apprenant.fullName.toLowerCase().includes(query) ||
        apprenant.email?.toLowerCase().includes(query) ||
        apprenant.phone?.toLowerCase().includes(query) ||
        apprenant.city?.toLowerCase().includes(query) ||
        apprenant.status?.toLowerCase().includes(query)
      )
    })
  }, [searchQuery, apprenants])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredApprenants.map((a) => a.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newIds = new Set(selectedIds)
    if (checked) {
      newIds.add(id)
    } else {
      newIds.delete(id)
    }
    setSelectedIds(newIds)
  }

  const allSelected = filteredApprenants.length > 0 && selectedIds.size === filteredApprenants.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredApprenants.length

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Filtrer par nom, email, téléphone, ville, statut..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-bo-bleu focus:outline-none focus:ring-1 focus:ring-bo-bleu"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            ✕ Effacer
          </button>
        )}
      </div>

      {/* Bulk Actions Ribbon */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-300 bg-orange-50 p-4">
          <span className="text-sm font-semibold text-orange-900">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => {
                const apprenant = apprenants.find((a) => selectedIds.has(a.id))
                if (apprenant) setSelectedApprenant(apprenant)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-bo-bleu px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              👁️ Voir
            </button>
            <button
              onClick={async () => {
                const ids = Array.from(selectedIds)
                const response = await fetch('/admin/api/bulk-validate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ids, action: 'validate' }),
                })
                if (response.ok) {
                  setSelectedIds(new Set())
                  window.location.reload()
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
            >
              ✓ Valider
            </button>
            <button
              onClick={async () => {
                if (!confirm(`Supprimer ${selectedIds.size} apprenant(s) ?`)) return
                const ids = Array.from(selectedIds)
                const response = await fetch('/admin/api/bulk-validate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ids, action: 'reject' }),
                })
                if (response.ok) {
                  setSelectedIds(new Set())
                  window.location.reload()
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left">
                <input
                  ref={checkboxRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nom</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Téléphone</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ville</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Statut</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Genre</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Validation</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date d'ajout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredApprenants.length > 0 ? (
              filteredApprenants.map((apprenant) => (
                <tr key={apprenant.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedApprenant(apprenant)}>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(apprenant.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleSelectOne(apprenant.id, e.target.checked)
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{apprenant.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{apprenant.fullName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{apprenant.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{apprenant.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{apprenant.city || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{apprenant.status || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{apprenant.gender || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      apprenant.validatedAt
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {apprenant.validatedAt ? '✓ Validé' : '◎ En attente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(apprenant.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-gray-600">
                  <p className="text-lg">Aucun apprenant trouvé</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedApprenant && (
        <ApprenantModal
          apprenant={selectedApprenant}
          onClose={() => setSelectedApprenant(null)}
        />
      )}

      {/* Footer */}
      <div className="text-sm text-gray-600">
        Affichage de {filteredApprenants.length} apprenant{filteredApprenants.length > 1 ? 's' : ''} sur {apprenants.length} total
      </div>
    </div>
  )
}
