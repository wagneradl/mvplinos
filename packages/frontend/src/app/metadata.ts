import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Lino's Panificadora - Sistema de Gestão de Pedidos",
  description: 'Sistema de gestão de pedidos da panificadora do Lino',
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
};
