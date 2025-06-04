import React from 'react';

import '@testing-library/jest-dom';

import { render, screen } from '../utils/test-utils.js';

// A simple component to test the React Testing Library setup
const SimpleComponent = ({ text }: { text: string }) => {
  return <div data-testid="simple-component">{text}</div>;
};

describe('SimpleComponent', () => {
  it('renders the provided text', () => {
    const { container } = render(<SimpleComponent text="Hello, world!" />);

    // Test using screen queries
    expect(screen.getByTestId('simple-component')).toBeInTheDocument();
    expect(screen.getByTestId('simple-component')).toHaveTextContent('Hello, world!');

    // Test using container queries
    const element = container.querySelector('[data-testid="simple-component"]');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello, world!');
  });

  it('renders correctly with different text', () => {
    const { container } = render(<SimpleComponent text="Testing React 19" />);

    expect(container.textContent).toContain('Testing React 19');
  });
});
