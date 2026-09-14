'use client'

import { useState } from 'react'

interface DocumentUploadProps {
  learnerId: string
  docType: 'cv' | 'id'
  onSuccess?: () => void
}

export function DocumentUpload({ learnerId, docType, onSuccess }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('learnerId', learnerId)
      formData.append('docType', docType)

      const response = await fetch('/admin/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      // Reset input and show success
      e.target.value = ''
      onSuccess?.()
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const docLabel = docType === 'cv' ? 'CV' : "Document d'identité"

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm font-semibold text-gray-700">
          📤 Télécharger {docLabel}
        </span>
        <input
          type="file"
          onChange={handleUpload}
          disabled={isUploading}
          accept={docType === 'cv' ? '.pdf,.doc,.docx' : '.pdf,.jpg,.jpeg,.png'}
          className="mt-2 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50"
        />
      </label>
      {isUploading && <p className="text-sm text-blue-600">⏳ Téléchargement...</p>}
      {error && <p className="text-sm text-red-600">❌ {error}</p>}
    </div>
  )
}
