/** URL publique de l'application, utilisée dans les liens WhatsApp et personnels. */
export function appUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
}

export function learnerLink(token: string): string {
  return `${appUrl()}/l/${token}`
}
