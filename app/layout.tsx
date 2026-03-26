import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NordicGolfers.com — Golfrejser med Prisgaranti | AI Assistent',
  description: 'Find din perfekte golfrejse med vores AI-assistent. 800+ golfbaner og resorts i 30+ lande. Prisgaranti og medlem af Rejsegarantifonden.',
  openGraph: {
    title: 'NordicGolfers.com — Golfrejser med Prisgaranti',
    description: 'Find din perfekte golfrejse med vores AI-assistent. 800+ golfbaner og resorts i 30+ lande.',
    type: 'website',
  },
  icons: {
    icon: 'https://www.nordicgolfers.com/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
