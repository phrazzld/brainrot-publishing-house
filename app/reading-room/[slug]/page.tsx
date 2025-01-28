"use client"

import translations from "@/translations"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import WaveSurfer from "wavesurfer.js"
import DownloadButton from '@/components/DownloadButton'

export default function ReadingRoom() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { slug } = useParams()

  const [rawText, setRawText] = useState("")
  const [waveSurfer, setWaveSurfer] = useState<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [chapterIndex, setChapterIndex] = useState(0)

  // share modal
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [shareFeedback, setShareFeedback] = useState("")
  const [includeChapter, setIncludeChapter] = useState(true)
  const [includeTimestamp, setIncludeTimestamp] = useState(true)

  // loading states
  const [isAudioLoading, setIsAudioLoading] = useState(false)
  const [isTextLoading, setIsTextLoading] = useState(false)

  const translation = translations.find((t) => t.slug === slug)
  const chapterData = translation?.chapters[chapterIndex]

  // pick up "c" param from the url if it exists
  useEffect(() => {
    const cParam = searchParams.get("c")
    if (cParam) {
      const cNum = parseInt(cParam, 10)
      if (!isNaN(cNum)) setChapterIndex(cNum)
    }
  }, [searchParams])

  // once waveSurfer is ready, parse "t" param to seek
  useEffect(() => {
    if (!waveSurfer) return

    function handleReady() {
      if (!waveSurfer) return
      const tParam = searchParams.get("t")
      const duration = waveSurfer.getDuration()
      if (tParam && duration && !isNaN(duration) && duration > 0) {
        const numericT = Number(tParam)
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

  // fetch text & possibly init waveSurfer when chapter changes
  useEffect(() => {
    if (!chapterData) return

    // text loading
    setIsTextLoading(true)
    fetch(chapterData.text)
      .then((res) => res.text())
      .then((txt) => {
        setRawText(txt.replaceAll("\n\n", "\n"))
      })
      .catch((err) => setRawText(`error loading text: ${err}`))
      .finally(() => setIsTextLoading(false))

    // only set up WaveSurfer if we have audio
    if (chapterData.audioSrc) {
      if (waveSurfer) {
        try {
          waveSurfer.destroy()
        } catch { }
      }
      setIsAudioLoading(true)
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
        setIsAudioLoading(false)
      })
      ws.on("audioprocess", () => {
        setCurrentTime(ws.getCurrentTime())
      })
      ws.on("play", () => setIsPlaying(true))
      // on pause, update the url with current timestamp
      ws.on("pause", () => {
        setIsPlaying(false)
        setCurrentTime(ws.getCurrentTime()) // sync state
        updateUrlWithChapterAndTimestamp(ws.getCurrentTime())
      })
      // on finish, we can reset time but also update url t=0 if you like
      ws.on("finish", () => {
        setIsPlaying(false)
        setCurrentTime(0)
        updateUrlWithChapterAndTimestamp(0)
      })

      setWaveSurfer(ws)
      return () => {
        try {
          ws.destroy()
        } catch { }
      }
    } else {
      // no audio: if waveSurfer was set, destroy it
      if (waveSurfer) {
        try {
          waveSurfer.destroy()
        } catch { }
      }
      setWaveSurfer(null)
      setIsPlaying(false)
      setCurrentTime(0)
      setTotalTime(0)
      setIsAudioLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterData])

  // whenever chapterIndex changes, update the url with c=...
  // and nuke the timestamp
  useEffect(() => {
    if (!translation) return
    updateUrlWithChapterAndTimestamp(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex])

  function updateUrlWithChapterAndTimestamp(ts: number) {
    const c = chapterIndex
    const t = Math.floor(ts)
    let newUrl = `/reading-room/${slug}?c=${c}`
    if (t > 0) {
      newUrl += `&t=${t}`
    }
    router.replace(newUrl)
  }

  // playback controls
  function togglePlayPause() {
    waveSurfer?.playPause()
  }

  function goPrevChapter() {
    if (chapterIndex > 0) {
      setChapterIndex(chapterIndex - 1)
    }
  }

  function goNextChapter() {
    if (translation && chapterIndex < translation.chapters.length - 1) {
      setChapterIndex(chapterIndex + 1)
    }
  }

  // chapter pill click
  function handleChapterClick(i: number) {
    setChapterIndex(i)
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

  // share modal
  function openShareModal() {
    setIsShareOpen(true)
    setShareFeedback("")
  }
  function closeShareModal() {
    setIsShareOpen(false)
  }
  function getShareUrl() {
    if (typeof window === "undefined") return ""
    const baseUrl = window.location.origin
    let url = `${baseUrl}/reading-room/${slug}?c=${chapterIndex}`
    const t = Math.floor(currentTime)
    if (includeTimestamp && t > 0) {
      url += `&t=${t}`
    }
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

  // bail out if no translation
  if (!translation) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-xl">no translation found</h1>
      </div>
    )
  }

  // gather chapters
  const totalChapters = translation.chapters.length
  const chaptersArray = Array.from({ length: totalChapters }, (_, i) => i)

  return (
    <div className="min-h-screen flex flex-col bg-midnight text-white font-body">
      {/* top nav */}
      <header className="sticky top-0 z-20 px-4 py-3 bg-black/40 backdrop-blur-md flex flex-col gap-2">
        {/* top row: title + next/prev */}
        <div className="w-full flex items-center justify-between">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-3">
            <span className="font-bold text-lg md:text-xl font-display">
              {translation.title}
            </span>
            <span className="text-sm text-lavender font-body">
              chapter {chapterIndex + 1}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!!translation.purchaseUrl && (
              <Link
                href={translation.purchaseUrl}
                className="btn btn-primary ml-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                buy now
              </Link>
            )}
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
                  chapterIndex === totalChapters - 1 ? "hidden" : "visible",
              }}
            >
              next →
            </button>
          </div>
        </div>
      </header>

      {/* only show audio player row if there's an audioSrc */}
      {chapterData?.audioSrc && (
        <div className="relative flex flex-col md:flex-row items-center md:items-stretch justify-between gap-4 px-4 py-3 bg-[#2c2c3a]">
          {/* wave */}
          <div id="waveform" className="flex-1 h-16" />
          {isAudioLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
              <div className="text-white text-sm font-body animate-pulse">
                loading up the vibes...
              </div>
            </div>
          )}
          {/* controls on the right */}
          <div className="flex items-center gap-3">
            <button onClick={togglePlayPause} className="btn btn-primary text-sm font-body">
              {isPlaying ? "pause" : "play"}
            </button>
            <button onClick={openShareModal} className="btn btn-secondary text-sm font-body">
              share
            </button>
            <div className="flex flex-col items-end text-xs font-body">
              <span className="text-peachy">{formatTime(currentTime)}</span>
              <span className="text-white/50">{formatTime(totalTime)}</span>
            </div>
          </div>
        </div>
      )}

      {/* only show these if there's audio to download */}
      {chapterData?.audioSrc && (
        <div className="p-4 flex gap-4">
          <DownloadButton slug={slug?.toString() || ""} type="chapter" chapter={chapterIndex + 1} />
          <DownloadButton slug={slug?.toString() || ""} type="full" classNames="btn-secondary" />
        </div>
      )}

      {/* horizontal chapter pills */}
      <div className="overflow-x-auto flex gap-2 p-4">
        {chaptersArray.map((cNum) => {
          const isActive = cNum === chapterIndex
          return (
            <button
              key={cNum}
              onClick={() => handleChapterClick(cNum)}
              className={`px-3 py-1 rounded-full border text-sm font-body ${isActive
                  ? "bg-peachy text-midnight border-peachy"
                  : "bg-black/30 text-white/80 border-white/20 hover:bg-black/50"
                }`}
            >
              {cNum + 1}
            </button>
          )
        })}
      </div>

      {/* reading content or loading placeholder */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 leading-relaxed">
        {isTextLoading ? (
          <div className="text-center text-lavender animate-pulse">
            loading text, hold up...
          </div>
        ) : (
          lines
        )}
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-20"
          onClick={(e) => {
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
