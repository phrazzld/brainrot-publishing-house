import { KeyboardEvent } from 'react';

/**
 * Utility function to handle keyboard interactions for accessibility
 * Triggers the provided action when Enter or Space key is pressed
 */
export const handleKeyboardInteraction = (
  event: KeyboardEvent<HTMLElement>,
  action: () => void
) => {
  if (event.key === 'Enter' || event.key === ' ') {
    // Prevent default behavior (like scrolling on Space)
    event.preventDefault();
    action();
  }
};
