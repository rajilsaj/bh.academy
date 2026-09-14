'use client'

import { Apprenant } from './ApprenantsList'

export function ApprenantModal({ apprenant, onClose }: { apprenant: Apprenant; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-lg bg-white shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{apprenant.fullName}</h2>
            <p className="mt-1 text-sm text-gray-600">{apprenant.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Email</p>
                <p className="mt-2 text-gray-900">{apprenant.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Téléphone</p>
                <p className="mt-2 text-gray-900">{apprenant.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Ville</p>
                <p className="mt-2 text-gray-900">{apprenant.city || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Date de naissance</p>
                <p className="mt-2 text-gray-900">{apprenant.dateOfBirth || '—'}</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Genre</p>
                <p className="mt-2 text-gray-900">{apprenant.gender || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Statut</p>
                <p className="mt-2 text-gray-900">{apprenant.status || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Statut de validation</p>
                <p className="mt-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                    apprenant.validatedAt
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {apprenant.validatedAt ? '✓ Validé' : '◎ En attente'}
                  </span>
                </p>
              </div>
              {apprenant.validatedAt && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Validé le</p>
                  <p className="mt-2 text-gray-900">
                    {new Date(apprenant.validatedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 border-t border-gray-200 pt-8 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Dates</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ajouté le :</span>
                  <span className="text-gray-900">{new Date(apprenant.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                {apprenant.formSubmittedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Formulaire soumis le :</span>
                    <span className="text-gray-900">
                      {new Date(apprenant.formSubmittedAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Consentements</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${apprenant.consentCommunity ? '✓' : '✕'}`}></span>
                  <span>Consentement communauté</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${apprenant.consentData ? '✓' : '✕'}`}></span>
                  <span>Consentement données</span>
                </div>
              </div>
            </div>

            {(apprenant.cvUrl || apprenant.idDocumentUrl) && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Documents</p>
                <div className="mt-3 space-y-2">
                  {apprenant.cvUrl && (
                    <a
                      href={apprenant.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-bo-bleu hover:underline"
                    >
                      📄 Voir le CV
                    </a>
                  )}
                  {apprenant.idDocumentUrl && (
                    <a
                      href={apprenant.idDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-bo-bleu hover:underline"
                    >
                      📋 Voir la pièce d'identité
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-8 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
