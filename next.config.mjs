/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Three.js publie ses chargeurs (`three/examples/jsm/*`) en ESM nu : on les
  // fait passer par le bundler pour qu'ils soient découpés et minifiés comme
  // le reste. Chargés à la demande par la seule boîte 3D de la vitrine.
  transpilePackages: ['three'],
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: {
      // Les ressources de cours (présentations, vidéos) montent à 50 Mo ; les
      // documents des apprenants restent plafonnés à 5 Mo dans leur action.
      bodySizeLimit: '55mb',
    },
  },
}
export default nextConfig
