"use client"
import translations from "@/translations"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import WaveSurfer from "wavesurfer.js"

// let's do a custom share modal rather than navigator.share

export default function ReadingRoom() {
  const searchParams = useSearchParams()
  const { slug } = useParams()

  const [rawText, setRawText] = useState("")
  const [waveSurfer, setWaveSurfer] = useState<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [chapterIndex, setChapterIndex] = useState(0)

  // share modal states
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [shareFeedback, setShareFeedback] = useState("")
  const [includeChapter, setIncludeChapter] = useState(true)
  const [includeTimestamp, setIncludeTimestamp] = useState(true)

  const translation = translations.find((t) => t.slug === slug)
  const chapterData = translation?.chapters[chapterIndex]

  // pick up chapter param
  useEffect(() => {
    const c = searchParams.get("c")
    if (c) {
      setChapterIndex(parseInt(c, 10))
    }
  }, [searchParams])

  // timestamp param once waveSurfer is ready
  useEffect(() => {
    if (!waveSurfer) return

    function handleReady() {
      if (!waveSurfer) return
      const t = searchParams.get("t")
      const duration = waveSurfer.getDuration()
      if (t && duration && !isNaN(duration) && duration > 0) {
        const numericT = Number(t)
        if (numericT > 0) {
          waveSurfer.seekTo(numericT / duration)
        }
      }
    }

    waveSurfer.on("ready", handleReady)
    return () => {
      waveSurfer.un("ready", handleReady)
    }
  }, [waveSurfer, searchParams])

  // fetch text & init waveSurfer
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
    const fullAudioSrc = `${process.env.NEXT_PUBLIC_SPACES_BASE_URL}${chapterData.audioSrc}`
    ws.load(fullAudioSrc)

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

  // controls
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

  // share modal logic
  function openShareModal() {
    setIsShareOpen(true)
    setShareFeedback("")
  }
  function closeShareModal() {
    setIsShareOpen(false)
  }

  // generate link based on user prefs
  function getShareUrl() {
    if (typeof window === "undefined") return ""

    const baseUrl = window.location.origin
    let url = `${baseUrl}/reading-room/${slug}`

    const params = new URLSearchParams()
    if (includeChapter) {
      params.set("c", chapterIndex.toString())
    }
    if (includeTimestamp) {
      params.set("t", Math.floor(currentTime).toString())
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`

    return url
  }

  async function copyShareUrl() {
    const shareUrl = getShareUrl()
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareFeedback("link is in your clipboard, glhf!")
    } catch (err) {
      console.error(err)
      setShareFeedback("couldn't copy link sry man")
    }
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
          <button
            onClick={openShareModal}
            className="btn btn-secondary text-sm font-body"
          >
            share
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

      {/* share modal */}
      {isShareOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={(e) => {
            // only close if clicked outside modal content
            if (e.target === e.currentTarget) closeShareModal()
          }}
        >
          <div className="w-full max-w-sm bg-[#2c2c3a] p-4 rounded-md relative">
            <button
              className="absolute top-2 right-2 text-lavender text-sm"
              onClick={closeShareModal}
            >
              ✕
            </button>
            <h2 className="text-xl mb-3 font-display">share the vibe</h2>

            {/* toggles */}
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeChapter}
                  onChange={() => setIncludeChapter((prev) => !prev)}
                />
                <span>include chapter</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeTimestamp}
                  onChange={() => setIncludeTimestamp((prev) => !prev)}
                />
                <span>include timestamp</span>
              </label>
            </div>

            {/* link display */}
            <div className="space-y-2">
              <label className="text-sm">your link</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-[#1f1f29] text-gray-100"
                readOnly
                value={getShareUrl()}
              />
            </div>

            {/* copy button */}
            <button
              onClick={copyShareUrl}
              className="btn btn-primary mt-3 block w-full"
            >
              copy link
            </button>
            {/* ephemeral feedback */}
            {shareFeedback && (
              <div className="mt-2 text-sm text-peachy">{shareFeedback}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
