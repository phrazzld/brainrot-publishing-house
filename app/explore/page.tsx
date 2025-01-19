"use client"

import translations from "@/translations"
import Image from "next/image"
import Link from "next/link"

export default function ExplorePage() {
  return (
    <section className="min-h-screen py-12 px-4 bg-midnight text-white">
      <h2 className="text-3xl md:text-4xl font-bold mb-10 tracking-wide text-lavender">
        explore our translations
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {translations.map((t) => {
          const isAvailable = t.status === "available"
          return (
            <div
              key={t.slug}
              className={`card relative ${!isAvailable ? "opacity-70 grayscale" : ""
                }`}
            >
              <Image
                src={t.coverImage}
                alt={t.title}
                width={800}
                height={600}
                className="w-full object-cover"
              />
              <div className="card-content">
                <h3 className="text-xl font-display mb-2">{t.title}</h3>
                <p className="text-sm mb-4">{t.shortDescription}</p>
                <div className="card-footer">
                  {isAvailable ? (
                    <Link href={`/reading-room/${t.slug}`} className="btn btn-secondary">
                      read now
                    </Link>
                  ) : (
                    <button
                      className="btn btn-secondary cursor-not-allowed"
                      title="coming soon"
                    >
                      coming soon
                    </button>
                  )}
                  {!!t.purchaseUrl && (
                    <Link
                      href={t.purchaseUrl}
                      className="btn btn-primary ml-4"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      buy now
                    </Link>
                  )}
                </div>
              </div>
              {!isAvailable && (
                <div className="absolute top-2 right-2 bg-peachy text-black px-2 py-1 text-xs font-bold rounded">
                  WIP
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
