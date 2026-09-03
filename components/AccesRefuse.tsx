import { fr } from '@/lib/i18n/fr'

/** Encarts et pastilles du back-office. Fond sombre, contrastes vérifiés. */

export function AccesRefuse() {
  return (
    <div className="bo-panneau">
      <h1 className="font-semibold">{fr.admin.accesRefuse}</h1>
      <p className="mt-2 text-sm text-bo-doux">{fr.admin.accesRefuseDetail}</p>
    </div>
  )
}

export function NiveauBadge({ level, className }: { level: string; className: string }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {level}
    </span>
  )
}

export function AlerteSombre({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="rounded-xl border border-bo-rose/40 bg-bo-rose/10 px-4 py-3 text-sm text-bo-rose"
      role="alert"
    >
      {children}
    </p>
  )
}

export function SuccesSombre({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-bo-menthe/40 bg-bo-menthe/10 px-4 py-3 text-sm text-bo-menthe">
      {children}
    </p>
  )
}
