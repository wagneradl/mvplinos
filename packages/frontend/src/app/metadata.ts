import { Metadata, Viewport } from 'next';

// Viewport export separado conforme recomendado pelo Next.js 15
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Lino's Panificadora - Sistema de Gestão",
  description: "Sistema de gestão integrado da Lino's Panificadora",
  metadataBase: new URL('https://sistema.linospanificadora.com'),
  icons: {
    icon: '/icon1.png',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/apple-icon.png',
    },
  },
  // Open Graph / Facebook
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://sistema.linospanificadora.com/',
    siteName: "Lino's Panificadora",
    title: "Lino's Panificadora - Sistema de Gestão",
    description: "Sistema de gestão integrado da Lino's Panificadora",
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: "Lino's Panificadora",
      },
    ],
  },
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: "Lino's Panificadora - Sistema de Gestão",
    description: "Sistema de gestão integrado da Lino's Panificadora",
    images: ['/opengraph-image.png'],
    creator: '@linospanificadora',
  },
  // Metadados adicionais
  keywords: 'panificadora, padaria, gestão, sistema, Lino, administração',
  authors: [{ name: "Lino's Panificadora" }],
  creator: "Lino's Panificadora",
  publisher: "Lino's Panificadora",
};
