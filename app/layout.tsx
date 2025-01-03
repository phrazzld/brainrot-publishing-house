import "./globals.css"
import type { Metadata } from "next"
import { ReactNode } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"

export const metadata: Metadata = {
  title: "brainrot publishing house",
  description: "zoomer translations of classic literature",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
