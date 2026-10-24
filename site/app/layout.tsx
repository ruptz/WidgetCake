import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { site } from '@/lib/content';
import './globals.css';

/**
 * The launcher's two voices, from the same files the app bundles: Archivo,
 * whose width axis runs names wide, and IBM Plex Mono for facts in capitals.
 */
const archivo = localFont({
  src: './fonts/archivo.woff2',
  variable: '--font-archivo',
  weight: '100 900',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
});

const plexMono = localFont({
  src: [
    { path: './fonts/plex-mono-400.woff2', weight: '400' },
    { path: './fonts/plex-mono-500.woff2', weight: '500' },
    { path: './fonts/plex-mono-600.woff2', weight: '600' },
  ],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.author, url: site.repoUrl }],
  creator: site.author,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: site.url,
    siteName: site.name,
    title: `${site.name}: ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name}: ${site.tagline}`,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#101114' },
    { media: '(prefers-color-scheme: light)', color: '#f4f5f7' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
