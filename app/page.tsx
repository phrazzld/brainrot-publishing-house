"use client"
import Link from "next/link"
import { useEffect, useRef } from "react"
import gsap from "gsap"

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement | null>(null)

  // swirl animation
  useEffect(() => {
    if (!heroRef.current) return
    gsap.to(heroRef.current, {
      backgroundPosition: "200% center",
      duration: 10,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    })
  }, [])

  return (
    <main className="relative min-h-screen flex flex-col bg-midnight text-white">
      {/* hero fills the rest of the screen */}
      <section
        ref={heroRef}
        className="flex-1 flex items-center justify-center text-center px-4 py-32
                   bg-gradient-to-r from-lavender to-peachy
                   overflow-hidden"
        style={{ backgroundSize: "400% 400%" }}
      >
        {/* glitch overlay shapes */}
        <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-30 bg-[url('/assets/images/neon_waves.png')] bg-cover" />

        <div className="relative z-10 max-w-3xl">
          <h1
            className="text-6xl md:text-8xl font-display mb-6 glitch-text"
            data-text="brainrot publishing"
          >
            brainrot publishing
          </h1>
          <p className="text-xl md:text-2xl mb-8 font-sans">
            zoomer translations of classic literature
          </p>
          <Link href="/explore" className="btn btn-primary text-lg">
            start exploring
          </Link>
        </div>
      </section>

      {/* marquee pinned to the bottom */}
      <div className="whitespace-nowrap overflow-x-hidden bg-black text-peachy font-bold">
        <div className="animate-marquee-slow">
          <span className="mx-8">the bible</span>
          <span className="mx-8">the aeneid</span>
          <span className="mx-8">the republic</span>
          <span className="mx-8">the prince</span>
          <span className="mx-8">war and peace</span>
          <span className="mx-8">the quran</span>
          <span className="mx-8">don quixote</span>
          <span className="mx-8">anna karenina</span>
          <span className="mx-8">king lear</span>
          <span className="mx-8">romeo and juliet</span>
          <span className="mx-8">hamlet</span>
          <span className="mx-8">macbeth</span>
          <span className="mx-8">a midsummer night’s dream</span>
          {/* add more if you like */}
        </div>
      </div>
    </main>
  )
}
