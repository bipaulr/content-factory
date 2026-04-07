import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/providers/auth-provider'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ["latin"] });


export const metadata: Metadata = {
  title: 'Content Factory - AI-Powered Content Creation',
  description: 'Multi-agent content creation platform. Transform product descriptions into coordinated content across Blog, Social Media, and Email channels.',
  generator: 'bipaulr',
  icons: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} font-sans antialiased bg-[#0a0a0a] text-white min-h-screen`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
