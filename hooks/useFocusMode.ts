/* hooks/useFocusMode.ts */
'use client';

import { useState } from 'react';

/* hooks/useFocusMode.ts */

/* hooks/useFocusMode.ts */

/* hooks/useFocusMode.ts */

export function useFocusMode() {
  const [focusMode, setFocusMode] = useState(false);
  function toggleFocusMode() {
    setFocusMode((prev) => !prev);
  }
  return { focusMode, toggleFocusMode };
}
