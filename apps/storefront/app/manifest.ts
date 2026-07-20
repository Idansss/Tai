import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'From Africa To You',
    short_name: 'F.A.T.U',
    description: 'Original African artwork, made wearable.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafaf7',
    theme_color: '#fafaf7',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
