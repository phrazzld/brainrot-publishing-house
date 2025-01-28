"use client"

import { useEffect, useState } from "react"

export default function TranslatePage() {
  const [query, setQuery] = useState("")
  const [model, setModel] = useState("gpt-4o")
  const [password, setPassword] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState("")
  const [running, setRunning] = useState(false)

  // we'll keep the event source in a ref or state
  // so we can close it if needed
  const [evtSource, setEvtSource] = useState<EventSource | null>(null)

  function startTranslation() {
    if (!query.trim() || !password.trim()) {
      alert("need query + password")
      return
    }
    setLogs([])
    setError("")
    setRunning(true)

    // build the SSE url
    const url = `/api/translate?query=${encodeURIComponent(query)}&model=${encodeURIComponent(
      model
    )}&password=${encodeURIComponent(password)}`

    const es = new EventSource(url)
    setEvtSource(es)

    es.onmessage = (evt) => {
      // default "message" event, if we didn't specify event type
      console.log("onmessage:", evt.data)
    }

    es.addEventListener("log", (event: MessageEvent) => {
      // append to logs
      setLogs((old) => [...old, `[log] ${event.data}`])
    })

    es.addEventListener("error", (event: MessageEvent) => {
      console.error("SSE error event", event)
      setError(`error: ${event.data}`)
      es.close()
      setEvtSource(null)
      setRunning(false)
    })

    es.addEventListener("done", (event: MessageEvent) => {
      // final text
      setLogs((old) => [...old, "[log] translation complete! initiating download..."])
      try {
        const { filename, content } = JSON.parse(event.data)
        // force download
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

  // optional: cleanup if page unmounts
  useEffect(() => {
    return () => {
      if (evtSource) {
        evtSource.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="min-h-screen p-4 flex flex-col gap-4">
      <h1 className="text-3xl">translate some public domain text</h1>

      <div className="flex flex-col gap-2 max-w-md">
        <label>password</label>
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
          <option value="gpt-4o">gpt-4o</option>
          <option value="deepseek/deepseek-r1">deepseek r1</option>
        </select>

        <label>enter book/author query</label>
        <input
          className="p-2 text-black"
          placeholder="e.g. alice in wonderland"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
