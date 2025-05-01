'use client';

import { useState } from 'react';

/**
 * A hook that provides focus mode state and toggle functionality
 */
export function useFocusMode() {
  const [focusMode, setFocusMode] = useState(false);
  function toggleFocusMode() {
    setFocusMode((prev) => !prev);
  }
  return { focusMode, toggleFocusMode };
}
