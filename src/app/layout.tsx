import type { Metadata, Viewport } from 'next';
import { MobileControls } from '@/components/MobileControls';
import './styles.css';
import './resilience.css';
import './startup.css';

export const metadata: Metadata = {
  title: 'AeroDrive Zenith',
  description: 'A fully offline-first browser-native driving simulator prototype.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'AeroDrive Zenith',
    statusBarStyle: 'black-translucent'
  },
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#07080a'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <MobileControls />
      </body>
    </html>
  );
}
