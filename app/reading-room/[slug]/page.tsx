"use client"
import { useParams } from "next/navigation"
import translations from "@/translations"
import { useEffect, useState } from "react"
import WaveSurfer from "wavesurfer.js"

export default function ReadingRoom() {
  const { slug } = useParams()

  const [rawText, setRawText] = useState("")
  const [waveSurfer, setWaveSurfer] = useState<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [chapterIndex, setChapterIndex] = useState(0)

  const translation = translations.find((t) => t.slug === slug)
  const chapterData = translation?.chapters[chapterIndex]

  // fetch text file & waveSurfer
  useEffect(() => {
    if (!chapterData) return

    fetch(chapterData.text)
      .then((res) => res.text())
      .then((txt) => {
        setRawText(txt.replaceAll("\n\n", "\n"))
      })
      .catch((err) => setRawText(`error loading text: ${err}`))

    if (waveSurfer) {
      try {
        waveSurfer.destroy()
      } catch { }
    }
    const ws = WaveSurfer.create({
      container: "#waveform",
      waveColor: "#666",
      progressColor: "#e0afff",
      cursorColor: "#ffdaab",
      height: 64,
    })
    ws.load(chapterData.audioSrc)

    ws.on("ready", () => {
      setIsPlaying(false)
      setTotalTime(ws.getDuration())
      setCurrentTime(0)
    })
    ws.on("audioprocess", () => {
      setCurrentTime(ws.getCurrentTime())
    })
    ws.on("play", () => setIsPlaying(true))
    ws.on("pause", () => setIsPlaying(false))
    ws.on("finish", () => {
      setIsPlaying(false)
      setCurrentTime(0)
    })

    setWaveSurfer(ws)
    return () => {
      try {
        ws.destroy()
      } catch { }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterData])

  function togglePlayPause() {
    if (waveSurfer) waveSurfer.playPause()
  }

  function goPrevChapter() {
    if (chapterIndex > 0) setChapterIndex(chapterIndex - 1)
  }
  function goNextChapter() {
    if (translation && chapterIndex < translation.chapters.length - 1) {
      setChapterIndex(chapterIndex + 1)
    }
  }

  // line numbering every 5 lines
  const lines = rawText.split("\n").map((line, i) => {
    if (!line.trim()) return <div key={i} className="my-2">&nbsp;</div>
    const showNum = (i + 1) % 5 === 0
    return (
      <div key={i} className="relative my-1 pl-12 font-body text-md">
        {showNum && (
          <span className="absolute left-0 top-0 w-10 text-right text-peachy text-sm select-none">
            {i + 1}
          </span>
        )}
        {line}
      </div>
    )
  })

  function formatTime(sec: number) {
    if (!sec || isNaN(sec)) return "0:00"
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? "0" + s : s}`
  }

  return (
    <div className="min-h-screen flex flex-col bg-midnight text-white font-body">
      {/* top nav */}
      <header className="sticky top-0 z-20 px-4 py-3 bg-black/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-3">
          <span className="font-bold text-lg md:text-xl font-display">
            {translation?.title}
          </span>
          <span className="text-sm text-lavender font-body">
            chapter {chapterIndex + 1}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={goPrevChapter}
            className="btn btn-secondary text-sm font-body"
            style={{ visibility: chapterIndex === 0 ? "hidden" : "visible" }}
          >
            ← prev
          </button>
          <button
            onClick={goNextChapter}
            className="btn btn-secondary text-sm font-body"
            style={{
              visibility:
                !translation || chapterIndex === translation.chapters.length - 1
                  ? "hidden"
                  : "visible",
            }}
          >
            next →
          </button>
        </div>
      </header>

      {/* wave surfer container */}
      <div className="flex flex-col md:flex-row items-center md:items-stretch justify-between gap-4 px-4 py-3 bg-[#2c2c3a]">
        <div id="waveform" className="flex-1 h-16" />
        {/* controls on the right */}
        <div className="flex items-center gap-3">
          <button onClick={togglePlayPause} className="btn btn-primary text-sm font-body">
            {isPlaying ? "pause" : "play"}
          </button>
          <div className="flex flex-col items-end text-xs font-body">
            <span className="text-peachy">{formatTime(currentTime)}</span>
            <span className="text-white/50">{formatTime(totalTime)}</span>
          </div>
        </div>
      </div>

      {/* reading content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 leading-relaxed">
        {lines}
      </main>

      {/* bottom nav */}
      <div className="flex items-center justify-center gap-4 py-3 bg-black/40 backdrop-blur-md">
        <button
          onClick={goPrevChapter}
          className="btn btn-secondary text-sm font-body"
          style={{ visibility: chapterIndex === 0 ? "hidden" : "visible" }}
        >
          ← prev
        </button>
        <button
          onClick={goNextChapter}
          className="btn btn-secondary text-sm font-body"
          style={{
            visibility:
              !translation || chapterIndex === translation.chapters.length - 1
                ? "hidden"
                : "visible",
          }}
        >
          next →
        </button>
      </div>
    </div>
  )
}
