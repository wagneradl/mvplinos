import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Lino's Panificadora - Sistema de Gestão",
  description: "Sistema de gestão integrado da Lino's Panificadora",
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/icon.png',
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
        url: '/og-image.png', // Imagem para compartilhamento (1200x630 recomendado)
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
    images: ['/og-image.png'],
    creator: '@linospanificadora',
  },
  // Metadados adicionais
  keywords: 'panificadora, padaria, gestão, sistema, Lino, administração',
  authors: [{ name: "Lino's Panificadora" }],
  creator: "Lino's Panificadora",
  publisher: "Lino's Panificadora",
};
