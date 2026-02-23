import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { metadata, viewport } from './metadata';

const inter = Inter({ subsets: ['latin'] });

export { metadata, viewport };

/**
 * RootLayout — providers globais apenas.
 * Sidebar/nav vão para os layouts dos route groups (admin)/(portal).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon1.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
