"use client";

import DownloadButton from "@/components/DownloadButton";
import translations from "@/translations";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import WaveSurfer from "wavesurfer.js";

export default function ReadingRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = useParams();

  const [rawText, setRawText] = useState("");
  const [waveSurfer, setWaveSurfer] = useState<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [chapterIndex, setChapterIndex] = useState(0);

  // share modal
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const [includeChapter, setIncludeChapter] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);

  // download modal
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  // loading states
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isTextLoading, setIsTextLoading] = useState(false);

  const translation = translations.find((t) => t.slug === slug);
  const chapterData = translation?.chapters[chapterIndex];

  // pick up "c" param from the url if it exists
  useEffect(() => {
    const cParam = searchParams.get("c");
    if (cParam) {
      const cNum = parseInt(cParam, 10);
      if (!isNaN(cNum)) setChapterIndex(cNum);
    }
  }, [searchParams]);

  // once waveSurfer is ready, parse "t" param to seek
  useEffect(() => {
    if (!waveSurfer) return;

    function handleReady() {
      if (!waveSurfer) return;
      const tParam = searchParams.get("t");
      const duration = waveSurfer.getDuration();
      if (tParam && duration && !isNaN(duration) && duration > 0) {
        const numericT = Number(tParam);
        if (numericT > 0) {
          waveSurfer.seekTo(numericT / duration);
        }
      }
    }

    waveSurfer.on("ready", handleReady);
    return () => {
      waveSurfer.un("ready", handleReady);
    };
  }, [waveSurfer, searchParams]);

  // fetch text & (re)initialize waveSurfer when chapter changes
  useEffect(() => {
    if (!chapterData) return;

    // load text
    setIsTextLoading(true);
    fetch(chapterData.text)
      .then((res) => res.text())
      .then((txt) => {
        // preserve line breaks
        setRawText(txt);
      })
      .catch((err) => setRawText(`error loading text: ${err}`))
      .finally(() => setIsTextLoading(false));

    // audio setup
    if (chapterData.audioSrc) {
      if (waveSurfer) {
        try {
          waveSurfer.destroy();
        } catch { }
      }
      setIsAudioLoading(true);
      const ws = WaveSurfer.create({
        container: "#waveform",
        waveColor: "#666",
        progressColor: "#e0afff",
        cursorColor: "#ffdaab",
        height: 48, // taller waveform
      });
      const fullAudioSrc = `${process.env.NEXT_PUBLIC_SPACES_BASE_URL}${chapterData.audioSrc}`;
      ws.load(fullAudioSrc);

      ws.on("ready", () => {
        setIsPlaying(false);
        setTotalTime(ws.getDuration());
        setCurrentTime(0);
        setIsAudioLoading(false);
      });
      ws.on("audioprocess", () => {
        setCurrentTime(ws.getCurrentTime());
      });
      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => {
        setIsPlaying(false);
        setCurrentTime(ws.getCurrentTime());
        updateUrlWithChapterAndTimestamp(ws.getCurrentTime());
      });
      ws.on("finish", () => {
        setIsPlaying(false);
        setCurrentTime(0);
        updateUrlWithChapterAndTimestamp(0);
      });

      setWaveSurfer(ws);
      return () => {
        try {
          ws.destroy();
        } catch { }
      };
    } else {
      // no audio available
      if (waveSurfer) {
        try {
          waveSurfer.destroy();
        } catch { }
      }
      setWaveSurfer(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setTotalTime(0);
      setIsAudioLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterData]);

  // update url on chapter change
  useEffect(() => {
    if (!translation) return;
    updateUrlWithChapterAndTimestamp(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex]);

  function updateUrlWithChapterAndTimestamp(ts: number) {
    const c = chapterIndex;
    const t = Math.floor(ts);
    let newUrl = `/reading-room/${slug}?c=${c}`;
    if (t > 0) {
      newUrl += `&t=${t}`;
    }
    router.replace(newUrl);
  }

  // playback controls
  function togglePlayPause() {
    waveSurfer?.playPause();
  }

  function goPrevChapter() {
    if (chapterIndex > 0) {
      setChapterIndex(chapterIndex - 1);
    }
  }

  function goNextChapter() {
    if (translation && chapterIndex < translation.chapters.length - 1) {
      setChapterIndex(chapterIndex + 1);
    }
  }

  function handleChapterClick(i: number) {
    setChapterIndex(i);
  }

  function formatTime(sec: number) {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" + s : s}`;
  }

  // share modal handlers
  function openShareModal() {
    setIsShareOpen(true);
    setShareFeedback("");
  }
  function closeShareModal() {
    setIsShareOpen(false);
  }
  function getShareUrl() {
    if (typeof window === "undefined") return "";
    const baseUrl = window.location.origin;
    let url = `${baseUrl}/reading-room/${slug}`;
    if (includeChapter) {
      url += `?c=${chapterIndex}`;
    }
    const t = Math.floor(currentTime);
    if (includeTimestamp && t > 0) {
      url += includeChapter ? `&t=${t}` : `?t=${t}`;
    }
    return url;
  }
  async function copyShareUrl() {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback("link is in your clipboard, glhf!");
    } catch (err) {
      console.error(err);
      setShareFeedback("couldn't copy link sry man");
    }
  }

  // download modal handlers
  function openDownloadModal() {
    setIsDownloadOpen(true);
  }
  function closeDownloadModal() {
    setIsDownloadOpen(false);
  }

  if (!translation) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-xl">no translation found</h1>
      </div>
    );
  }

  const totalChapters = translation.chapters.length;
  const chaptersArray = Array.from({ length: totalChapters }, (_, i) => i);
  const lines = rawText.split("\n").map((line, i) => (
    <div key={i} className="my-1">
      {line.trim() ? line : <>&nbsp;</>}
    </div>
  ));

  return (
    <div className="min-h-screen flex bg-midnight text-white">
      {/* sticky sidebar - narrower width */}
      <aside className="w-48 bg-black/30 p-4 sticky top-0 h-screen overflow-y-auto">
        <h2 className="text-lg font-display mb-4 text-peachy">chapters</h2>
        <nav className="flex flex-col space-y-2">
          {chaptersArray.map((cNum) => {
            const isActive = cNum === chapterIndex;
            return (
              <button
                key={cNum}
                onClick={() => handleChapterClick(cNum)}
                className={`px-3 py-2 rounded border text-sm font-body text-left ${isActive
                  ? "bg-peachy text-midnight border-peachy"
                  : "bg-black/30 text-white/80 border-white/20 hover:bg-black/50"
                  }`}
              >
                {translation.chapters[cNum].title}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* main content */}
      <div className="flex-1 flex flex-col">
        {/* top bar: translation info & controls */}
        <header className="px-4 py-3 flex items-center justify-between bg-black/40 backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-display">{translation.title}</h1>
            <p className="text-sm text-lavender">{translation.chapters[chapterIndex].title}</p>
          </div>
          <div className="flex items-center gap-2">
            {translation.purchaseUrl && (
              <Link
                href={translation.purchaseUrl}
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                buy now
              </Link>
            )}
            <button
              onClick={goPrevChapter}
              className={`btn btn-secondary ${chapterIndex === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              disabled={chapterIndex === 0}
            >
              ← prev
            </button>
            <button
              onClick={goNextChapter}
              className={`btn btn-secondary ${chapterIndex === totalChapters - 1
                ? "opacity-50 cursor-not-allowed"
                : ""
                }`}
              disabled={chapterIndex === totalChapters - 1}
            >
              next →
            </button>
            <button onClick={openShareModal} className="btn btn-secondary">
              share
            </button>
          </div>
        </header>

        {/* audio & download row */}
        {chapterData?.audioSrc && (
          <div className="p-4 bg-[#2c2c3a] relative">
            {isAudioLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                <div className="text-white text-sm font-body animate-pulse">
                  loading up the vibes...
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div id="waveform" className="flex-1 h-[48px]" />
              <button onClick={togglePlayPause} className="btn btn-primary">
                {isPlaying ? "pause" : "play"}
              </button>
              <div className="text-xs text-peachy whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(totalTime)}
              </div>
              <button onClick={openDownloadModal} className="btn btn-secondary">
                download
              </button>
            </div>
          </div>
        )}

        {/* actual text */}
        <main className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto">
          {isTextLoading ? (
            <div className="text-center text-lavender animate-pulse">
              loading text, hold up...
            </div>
          ) : (
            lines
          )}
        </main>
      </div>

      {/* share modal */}
      {isShareOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-20"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeShareModal();
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
            <div className="space-y-2">
              <label className="text-sm">your link</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-[#1f1f29] text-gray-100"
                readOnly
                value={getShareUrl()}
              />
            </div>
            <button
              onClick={copyShareUrl}
              className="btn btn-primary mt-3 block w-full"
            >
              copy link
            </button>
            {shareFeedback && (
              <div className="mt-2 text-sm text-peachy">{shareFeedback}</div>
            )}
          </div>
        </div>
      )}

      {/* download modal */}
      {isDownloadOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-20"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDownloadModal();
          }}
        >
          <div className="w-full max-w-sm bg-[#2c2c3a] p-4 rounded-md relative">
            <button
              className="absolute top-2 right-2 text-lavender text-sm"
              onClick={closeDownloadModal}
            >
              ✕
            </button>
            <h2 className="text-xl mb-3 font-display">download options</h2>
            <div className="flex flex-col space-y-2">
              <DownloadButton
                slug={slug?.toString() || ""}
                type="chapter"
                chapter={chapterIndex + 1}
                classNames="btn btn-primary"
              />
              <DownloadButton
                slug={slug?.toString() || ""}
                type="full"
                classNames="btn btn-secondary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
