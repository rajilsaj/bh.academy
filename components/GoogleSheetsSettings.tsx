'use client'

import { useState } from 'react'
import { updateSetting } from '@/app/admin/(protege)/configuration/actions'

interface GoogleSheetsSettingsProps {
  spreadsheetId: string
  sheetName: string
}

export function GoogleSheetsSettings({ spreadsheetId, sheetName }: GoogleSheetsSettingsProps) {
  const [id, setId] = useState(spreadsheetId)
  const [name, setName] = useState(sheetName)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await updateSetting('google_sheets_spreadsheet_id', id)
      await updateSetting('google_sheets_sheet_name', name)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-1 text-lg font-bold">📊 Source Google Sheets</h3>
      <p className="bo-doux mb-4 text-sm">Où chercher les apprenants à importer</p>

      <div className="space-y-4">
        {/* Spreadsheet ID */}
        <div>
          <label className="mb-2 block text-sm font-semibold">URL du Google Sheet</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Collez l'ID du sheet ici"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">À trouver dans l'URL : /d/<strong>ID_ICI</strong>/edit</p>
        </div>

        {/* Sheet Name */}
        <div>
          <label className="mb-2 block text-sm font-semibold">Nom de l'onglet</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Form Responses 1"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">Le nom de l'onglet exactement comme il apparaît</p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className={`w-full rounded-lg px-4 py-2 font-semibold transition-all ${
            loading
              ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
              : 'bg-bo-bleu text-white hover:bg-bo-bleu/90'
          }`}
        >
          {loading ? '⟳ Enregistrement...' : '💾 Enregistrer'}
        </button>

        {/* Success */}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            ✅ Paramètres mis à jour
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  )
}
