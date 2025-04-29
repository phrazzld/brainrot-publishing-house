import React, { ReactElement } from 'react';
import { render as rtlRender, act as rtlAct } from '@testing-library/react';

// Custom render function for React 19 compatibility
export function render(ui: ReactElement) {
  // Create a container div that exists in the document
  const container = document.createElement('div');
  document.body.innerHTML = ''; // Clear any previous content
  document.body.appendChild(container);
  
  // Use a more direct approach for React 19
  const wrapper = document.createElement('div');
  container.appendChild(wrapper);
  
  // Render into the wrapper
  const result = rtlRender(ui, { container: wrapper });
  
  return {
    ...result,
    container: wrapper
  };
}

// Export the act function
export const act = rtlAct;

// Re-export everything from testing-library/react
export * from '@testing-library/react';
export { render, act };