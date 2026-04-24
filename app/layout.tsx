import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'CubiqHost — Minecraft Server Hosting',
  description:
    'Affordable, fast & reliable Minecraft hosting built for smooth gameplay. Host your server instantly.',
  keywords: ['minecraft', 'server hosting', 'game server', 'minecraft server', 'cubiqhost'],
  authors: [{ name: 'CubiqHost' }],
  openGraph: {
    title: 'CubiqHost — Minecraft Server Hosting',
    description: 'Affordable, fast & reliable Minecraft hosting built for smooth gameplay.',
    url: 'https://cubiqhost.in',
    siteName: 'CubiqHost',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CubiqHost — Minecraft Server Hosting',
    description: 'Affordable, fast & reliable Minecraft hosting built for smooth gameplay.',
  },
}

export const viewport = {
  themeColor: '#22c55e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased min-h-screen`}>
        {children}
        {/* Global toast notifications — used everywhere via sonner's toast() */}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            },
          }}
        />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
