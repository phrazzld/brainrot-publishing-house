import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { primary, secondary } from './fonts'
import Footer from '@/components/footer'
import Header from '@/components/header'

export const metadata: Metadata = {
  title: 'brainrot publishing house',
  description: 'zoomer translations of classic literature',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${primary.variable} ${secondary.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* header */}
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
