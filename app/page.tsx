import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* header */}
      <header className="flex items-center justify-between w-full px-6 py-4 bg-black/25 backdrop-blur-sm sticky top-0 z-10">
        <div className="brainrot-logo">
          brainrot publishing house
        </div>
        <nav className="space-x-6">
          <a href="#hero" className="hover:text-peachy transition">home</a>
          <a href="#explore" className="hover:text-peachy transition">explore</a>
        </nav>
      </header>

      {/* hero */}
      <section id="hero" className="hero-gradient">
        <div className="z-10 max-w-2xl mx-auto px-4">
          <h1
            className="text-5xl md:text-6xl font-bold mb-6 glitch-text"
            data-text="classic lit reimagined"
          >
            classic lit reimagined
          </h1>
          <p className="text-base md:text-lg mb-8">
            we gather dusty tomes and spin them into <span className="italic text-peachy">gnarly new vibes</span>
          </p>
          <a href="#explore" className="btn btn-primary">
            start exploring
          </a>
        </div>
      </section>

      {/* main content */}
      <section id="explore" className="px-6 py-16">
        <h2 className="text-3xl md:text-4xl mb-8 text-lavender font-bold">
          explore our translations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* card 1 */}
          <div className="card">
            <Image
              src="/assets/images/achilles-03.png"
              alt="iliad cover"
              width={700}
              height={400}
              className="w-full h-64 object-cover"
            />
            <div className="card-content">
              <h3 className="text-xl font-bold mb-2">the iliad</h3>
              <div className="card-footer">
                <Link href="/the-iliad" className="btn btn-secondary">
                  read now
                </Link>
              </div>
            </div>
          </div>
          {/* card 2 */}
          <div className="card">
            <Image
              src="/assets/images/achilles-01.png"
              alt="the odyssey cover"
              width={700}
              height={400}
              className="w-full h-64 object-cover"
            />
            <div className="card-content">
              <h3 className="text-xl font-bold mb-2">the odyssey</h3>
              <div className="card-footer">
                <button className="btn btn-secondary">notify me</button>
              </div>
            </div>
          </div>
          {/* card 3 */}
          <div className="card">
            <Image
              src="/assets/images/inferno-01.png"
              alt="dante's inferno cover"
              width={700}
              height={400}
              className="w-full h-64 object-cover"
            />
            <div className="card-content">
              <h3 className="text-xl font-bold mb-2">dante’s inferno</h3>
              <div className="card-footer">
                <button className="btn btn-secondary">notify me</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-white/10 py-6 text-center text-sm text-white/70 mt-auto">
        © brainrot publishing house. all rights reserved.
      </footer>
    </main>
  )
}
