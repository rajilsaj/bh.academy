import Link from 'next/link'

export default function NewCoursePage() {
  return (
    <div style={{ padding: '24px' }}>
      <Link href="/admin/courses" style={{ color: '#4CAF50', textDecoration: 'none', marginBottom: '16px', display: 'inline-block' }}>
        ← Retour
      </Link>
      <h1>Créer un nouveau cours</h1>
      <p>Page en construction</p>
    </div>
  )
}
