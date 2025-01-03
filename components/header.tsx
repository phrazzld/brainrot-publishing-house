"use client"
import Link from "next/link"

export default function Header() {
  return (
    <header className="sticky top-0 z-50 px-4 py-3 bg-black/30 backdrop-blur-sm flex items-center justify-between">
      <Link href="/" className="text-lavender font-bold text-lg tracking-wider">
        brainrot <span className="text-peachy">publishing house</span>
      </Link>
      <nav className="space-x-6">
        <Link href="/explore" className="hover:text-peachy transition">
          explore
        </Link>
      </nav>
    </header>
  )
}
