// apps/admin/src/app/layout.tsx
// Root layout for admin — only used by pages outside the (admin) group (e.g. /login)
// The (admin)/layout.tsx provides the full shell for authenticated pages
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nexus Admin',
  robots: 'noindex, nofollow',
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0A0A0C; color: #E8E6DF; font-family: 'Outfit', sans-serif; }
          *::-webkit-scrollbar { width: 3px; height: 3px; }
          *::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.11); border-radius: 2px; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
