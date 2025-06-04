import { ReactElement } from 'react';

import * as rtl from '@testing-library/react';

// Our custom render function that overrides the standard one
export function render(ui: ReactElement) {
  // Create a container div that exists in the document
  const container = document.createElement('div');
  document.body.innerHTML = ''; // Clear any previous content
  document.body.appendChild(container);

  // Use a more direct approach for React 19
  const wrapper = document.createElement('div');
  container.appendChild(wrapper);

  // Render into the wrapper
  const result = rtl.render(ui, { container: wrapper });

  return {
    ...result,
    container: wrapper,
  };
}

// Our act function just reuses the original
export const act = rtl.act;

// Re-export everything else from testing-library/react that isn't overridden above
export const screen = rtl.screen;
export const fireEvent = rtl.fireEvent;
export const waitFor = rtl.waitFor;
export const within = rtl.within;
export const prettyDOM = rtl.prettyDOM;
export const configure = rtl.configure;
export const cleanup = rtl.cleanup;
