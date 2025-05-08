import { NextResponse } from 'next/server';

export async function GET() {
  // Manifest dinâmico que pode ser personalizado com base no ambiente
  const manifest = {
    name: "Lino's Panificadora - Sistema de Gestão",
    short_name: "Lino's Panificadora",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon1.png",
        sizes: "32x32",
        type: "image/png"
      }
    ],
    theme_color: "#1976d2",
    background_color: "#ffffff",
    display: "standalone",
    scope: "/",
    start_url: "/pedidos",
    description: "Sistema de gestão para Lino's Panificadora"
  };

  // Retornar o manifest como JSON com os cabeçalhos corretos
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
