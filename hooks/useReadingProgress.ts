'use client';

import { useEffect, useState } from 'react';

/**
 * A hook that tracks reading progress based on scroll position
 * Used for the progress bar at the top of the page
 */
export function useReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const percent = docHeight ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.floor(percent)));
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { progress };
}
