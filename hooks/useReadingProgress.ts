// hooks/useReadingProgress.ts
// track reading progress based on scroll (for that little bar at the top)
"use client"

import { useState, useEffect } from 'react'

export function useReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY
      const docHeight = document.body.scrollHeight - window.innerHeight
      const percent = docHeight ? (scrollTop / docHeight) * 100 : 0
      setProgress(Math.min(100, Math.floor(percent)))
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return { progress }
}

