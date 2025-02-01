"use client"

import { useEffect, useState } from "react"

export default function TranslatePage() {
  const [query, setQuery] = useState("")
  const [model, setModel] = useState("o3-mini")
  const [password, setPassword] = useState("")
  const [notes, setNotes] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState("")
  const [running, setRunning] = useState(false)
  const [evtSource, setEvtSource] = useState<EventSource | null>(null)

  function startTranslation() {
    if (!query.trim() || !password.trim()) {
      alert("need query + password")
      return
    }
    setLogs([])
    setError("")
    setRunning(true)

    let url = `/api/translate?query=${encodeURIComponent(query)}&model=${encodeURIComponent(
      model
    )}&password=${encodeURIComponent(password)}`

    if (notes.length > 0) {
      url += `&notes=${encodeURIComponent(notes)}`
    }

    const es = new EventSource(url)
    setEvtSource(es)

    es.onmessage = (evt) => {
      console.log("onmessage:", evt.data)
    }

    es.addEventListener("log", (event: MessageEvent) => {
      setLogs((old) => [`[log] ${event.data}`, ...old])
    })

    es.addEventListener("error", (event: MessageEvent) => {
      console.error("SSE error event", event)
      setError(`error: ${event.data}`)
      es.close()
      setEvtSource(null)
      setRunning(false)
    })

    // automatically download the raw source text on "source" event
    es.addEventListener("source", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data)
        const { filename, content } = payload
        const blob = new Blob([content], { type: "text/plain" })
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = downloadUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(downloadUrl)

        setLogs((old) => [`[log] downloaded source text -> ${filename}`, ...old])
      } catch (err) {
        console.error("failed to parse source event", err)
        setError("couldn't parse raw source text: " + String(err))
      }
    })

    // automatically download the final translation on "done" event
    es.addEventListener("done", (event: MessageEvent) => {
      setLogs((old) => ["[log] translation complete! initiating download...", ...old])
      try {
        const { filename, content } = JSON.parse(event.data)
        const blob = new Blob([content], { type: "text/plain" })
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = downloadUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(downloadUrl)
      } catch (err) {
        console.error("failed to parse done event", err)
        setError("failed to parse final text: " + String(err))
      }
      es.close()
      setEvtSource(null)
      setRunning(false)
    })
  }

  useEffect(() => {
    return () => {
      if (evtSource) {
        evtSource.close()
      }
    }
  }, [evtSource])

  return (
    <main className="min-h-screen p-4 flex flex-col gap-4">
      <h1 className="text-3xl">translate some public domain text</h1>

      <div className="flex flex-col gap-2 max-w-md">
        <label>password (for private usage)</label>
        <input
          type="password"
          className="p-2 text-black"
          placeholder="enter secret"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label>pick a model</label>
        <select
          className="p-2 text-black"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {MODEL_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label>enter book/author query</label>
        <input
          className="p-2 text-black"
          placeholder="e.g. alice in wonderland"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <label>other notes</label>
        <input
          className="p-2 text-black"
          placeholder={"e.g. always start chapters with \"whadup chat, it's ya boi\""}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button
          className="btn btn-primary"
          onClick={startTranslation}
          disabled={running}
        >
          {running ? "translating..." : "translate → sse stream"}
        </button>
      </div>

      {error && <div className="text-red-400">error: {error}</div>}

      <div className="mt-4 bg-black/20 p-2 rounded-md max-w-2xl">
        <h2 className="text-lg font-semibold mb-2">logs</h2>
        <div className="text-sm">
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </main>
  )
}

const MODEL_OPTIONS = [
  { value: "gpt-4o", label: "gpt-4o" },
  { value: "o3-mini", label: "o3-mini" },
  { value: "o1", label: "o1" },
  { value: "deepseek/deepseek-r1", label: "deepseek r1" },
]
