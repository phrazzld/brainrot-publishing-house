/* hooks/useFocusMode.ts */
"use client"
import { useState } from 'react'

export function useFocusMode() {
  const [focusMode, setFocusMode] = useState(false)
  function toggleFocusMode() {
    setFocusMode((prev) => !prev)
  }
  return { focusMode, toggleFocusMode }
}

