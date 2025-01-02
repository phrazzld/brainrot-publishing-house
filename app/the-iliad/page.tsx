"use client"
import { useEffect, useRef, useState } from "react"
import books from "@/lib/books"

export default function Iliad() {
  const [currentBookIndex, setCurrentBookIndex] = useState(0)
  const [poemText, setPoemText] = useState("")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    loadBook(currentBookIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBookIndex])

  function loadBook(index: number) {
    const bookData = books[index]
    if (!bookData) return

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = bookData.audioSrc
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setDuration(0)
    setCurrentTime(0)

    fetch(bookData.text)
      .then((r) => r.text())
      .then((raw) => {
        setPoemText(formatPoem(raw))
      })
      .catch((err) => {
        setPoemText("error: " + err)
      })
  }

  function togglePlayPause() {
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.play()
      setIsPlaying(true)
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  function handleTimeUpdate() {
    if (!audioRef.current) return
    setCurrentTime(audioRef.current.currentTime)
  }

  function handleLoadedMetadata() {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration)
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!audioRef.current) return
    audioRef.current.currentTime = Number(e.target.value)
  }

  function formatTime(s: number) {
    if (!s || isNaN(s)) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec < 10 ? "0" + sec : sec}`
  }

  function formatPoem(raw: string) {
    const lines = raw.replaceAll("\n\n", "\n").split("\n")
    let html = ""
    for (let i = 0; i < lines.length; i++) {
      const lineStr = lines[i].trim()
      if (lineStr) {
        if ((i + 1) % 5 === 0) {
          // line number every 5 lines
          html += `
            <div class="relative my-1 pl-8 leading-relaxed">
              <span class="absolute left-0 text-peachy text-sm opacity-80">${i + 1}</span>
              ${lineStr}
            </div>
          `
        } else {
          html += `
            <div class="my-1 pl-8 leading-relaxed">
              ${lineStr}
            </div>
          `
        }
      } else {
        html += `<div class="my-2">&nbsp;</div>`
      }
    }
    return html
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* sticky top bar */}
      <header className="sticky top-0 left-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="text-lavender font-bold uppercase">
            <a href="/">brainrot</a>
          </div>
          <button
            className="btn btn-secondary text-sm"
            onClick={() => currentBookIndex > 0 && setCurrentBookIndex(currentBookIndex - 1)}
            style={{ visibility: currentBookIndex === 0 ? "hidden" : "visible" }}
          >
            ← prev
          </button>
          <div className="font-semibold text-white">
            {books[currentBookIndex]?.title || `book ${currentBookIndex + 1}`}
          </div>
          <button
            className="btn btn-secondary text-sm"
            onClick={() =>
              currentBookIndex < books.length - 1 &&
              setCurrentBookIndex(currentBookIndex + 1)
            }
            style={{ visibility: currentBookIndex === books.length - 1 ? "hidden" : "visible" }}
          >
            next →
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded">
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          />
          <button
            className="px-3 py-1 bg-lavender text-black rounded font-bold"
            onClick={togglePlayPause}
          >
            {isPlaying ? "pause" : "play"}
          </button>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            step={0.1}
            className="w-24 accent-peachy"
          />
          <span className="text-sm text-peachy min-w-[2rem] text-right">
            {formatTime(currentTime)}
          </span>
          <span className="text-sm text-white/80 min-w-[2rem]">
            {formatTime(duration)}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 text-white">
        <h1 className="text-3xl font-bold mb-4 uppercase tracking-wider">the iliad</h1>
        <div
          className="mt-4 mb-16"
          dangerouslySetInnerHTML={{ __html: poemText }}
        />
      </main>

      <footer className="border-t border-white/20 py-4 text-center text-sm text-white/60">
        © brainrot publishing house. all rights reserved.
      </footer>
    </div>
  )
}
