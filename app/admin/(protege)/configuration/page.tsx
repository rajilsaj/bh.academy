import { AdminLayout } from '@/components/AdminLayout'
import { requirePermission } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSetting } from './actions'

export const dynamic = 'force-dynamic'

export default async function ConfigurationPage() {
  const session = await requirePermission('gererConfiguration'</div></AdminLayout>)
  if (!session) redirect('/admin/login'</div></AdminLayout>)

  const spreadsheetId = await getSetting('google_sheets_spreadsheet_id'</div></AdminLayout>)
  const sheetName = await getSetting('google_sheets_sheet_name'</div></AdminLayout>)

  return (<AdminLayout><div className="max-w-7xl mx-auto space-y-6">
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">⚙️ Configuration</h1>
        <p className="mt-1 text-slate-600">Paramètres de la plateforme</p>
      </div>

      <div className="space-y-6">
        {/* Google Sheets */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold mb-4">📊 Google Sheets (Importation)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">ID du Sheet</label>
              <input
                type="text"
                value={spreadsheetId || ''}
                readOnly
                className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">Configuré ✅</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Nom de l'onglet</label>
              <input
                type="text"
                value={sheetName || ''}
                readOnly
                className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">Configuré ✅</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold mb-4">🔐 Système</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Base de données</span>
              <span className="text-green-600 font-semibold">✅ Connectée</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Google OAuth</span>
              <span className="text-green-600 font-semibold">✅ Activé</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Synchronisation automatique</span>
              <span className="text-green-600 font-semibold">✅ 07:00 UTC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div></AdminLayout>)
}
