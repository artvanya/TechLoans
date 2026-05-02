// apps/investor/src/app/layout.tsx
import type { Metadata } from 'next'
import { DM_Serif_Display, DM_Mono, Outfit } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-dm-serif',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nexus Private Credit',
  description: 'Institutional private credit — senior secured real estate debt',
  robots: 'noindex, nofollow', // Private platform — not indexed
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSerif.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body className="bg-nexus-bg text-nexus-text antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
