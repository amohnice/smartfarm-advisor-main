import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';

// Load Inter font with optimized subsets
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', 'sans-serif'],
  preload: true,
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
});

export const metadata: Metadata = {
  title: 'SmartFarm Advisor - AI Agricultural Assistant',
  description: 'AI-powered farming advisor for African smallholder farmers',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SmartFarm',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#10b981',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SmartFarm" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className={`${inter.variable} font-sans bg-gray-50 text-gray-900 min-h-screen`}>
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
            {children}
          </main>
          <footer className="py-6 border-t border-gray-100 bg-white">
            <div className="container mx-auto px-4 text-center text-sm text-gray-500">
              <p>© {new Date().getFullYear()} SmartFarm Advisor. All rights reserved.</p>
            </div>
          </footer>
        </div>
        <Script id="sw-register" strategy="afterInteractive">
          {`
          if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Only register in production
            if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then(registration => {
                    console.log('Service Worker registered:', registration.scope);
                  })
                  .catch(error => {
                    console.error('Service Worker registration failed:', error);
                  });
              });
            } else {
              // In development, unregister any existing service workers
              navigator.serviceWorker.getRegistrations().then(registrations => {
                for (const registration of registrations) {
                  registration.unregister();
                }
              });
            }
          }
          `}
        </Script>
        </body>
        </html>
    );
}
