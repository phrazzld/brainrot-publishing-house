import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// A simple component to test the React Testing Library setup
const SimpleComponent = ({ text }: { text: string }) => {
  return <div data-testid="simple-component">{text}</div>;
};

describe('SimpleComponent', () => {
  it('renders the provided text', () => {
    render(<SimpleComponent text="Hello, world!" />);
    expect(screen.getByTestId('simple-component')).toHaveTextContent('Hello, world!');
  });
});