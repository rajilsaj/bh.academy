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
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bo-panneau space-y-4">
      <div>
        <h3 className="mb-3 font-semibold">Google Sheets Sync</h3>
        <p className="bo-doux mb-4 text-sm">Configure the Google Sheet used for learner imports</p>

        <div className="space-y-3">
          <div>
            <label className="bo-doux mb-1 block text-sm">Spreadsheet ID</label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="1bDNHIaswXofSMkQfF4ZwBAbVJ-KCLMC-x1RkpNznZeg"
              className="bo-champ w-full"
            />
            <p className="bo-doux mt-1 text-xs">Found in the Google Sheet URL after /d/</p>
          </div>

          <div>
            <label className="bo-doux mb-1 block text-sm">Sheet Tab Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Form Responses 1"
              className="bo-champ w-full"
            />
            <p className="bo-doux mt-1 text-xs">The exact name of the sheet tab to sync from</p>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="bo-bouton"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>

          {success && (
            <div className="rounded-bloc bg-green-50 p-3 text-sm text-green-700">
              ✓ Settings saved successfully
            </div>
          )}

          {error && (
            <div className="rounded-bloc bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
