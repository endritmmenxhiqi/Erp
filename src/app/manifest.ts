import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agoni ERP AI - Program për Biznes',
    short_name: 'Agoni ERP',
    description: 'Sistemi më i avancuar me AI për shitje, inventar, blerje dhe faturim në Kosovë',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#3b82f6',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
