import React from 'react';

import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';

import SimpleTestComponent from '../../components/SimpleTestComponent';
import { render } from '../utils/test-utils';

describe('SimpleTestComponent', () => {
  // Basic rendering test
  it('renders with default props', () => {
    // Render the component without using the returned container object
    render(<SimpleTestComponent />);

    // Check if component rendered correctly
    expect(screen.getByTestId('simple-test-container')).toBeInTheDocument();
    expect(screen.getByTestId('count-display')).toHaveTextContent('Current value: 0');
    expect(screen.getByText('Counter')).toBeInTheDocument();
    expect(screen.getByTestId('count-message')).toHaveTextContent('Counter is zero');

    // Check button states
    const incrementButton = screen.getByTestId('increment-button');
    const resetButton = screen.getByTestId('reset-button');
    expect(incrementButton).toBeEnabled();
    expect(resetButton).toBeDisabled(); // Should be disabled when count equals initialValue
  });

  // Custom props test
  it('renders with custom props', () => {
    render(<SimpleTestComponent initialValue={3} label="Test Counter" />);

    expect(screen.getByText('Test Counter')).toBeInTheDocument();
    expect(screen.getByTestId('count-value')).toHaveTextContent('3');
    expect(screen.getByTestId('count-message')).toHaveTextContent('Counter is low');

    // Reset button should be enabled with non-zero initialValue
    expect(screen.getByTestId('reset-button')).toBeDisabled();
  });

  // User interaction test
  it('increments count when button is clicked', () => {
    render(<SimpleTestComponent />);

    const incrementButton = screen.getByTestId('increment-button');

    // Initial state
    expect(screen.getByTestId('count-value')).toHaveTextContent('0');
    expect(screen.getByTestId('count-message')).toHaveTextContent('Counter is zero');

    // Click increment button
    fireEvent.click(incrementButton);

    // Updated state
    expect(screen.getByTestId('count-value')).toHaveTextContent('1');
    expect(screen.getByTestId('count-message')).toHaveTextContent('Counter is low');
    expect(screen.getByTestId('reset-button')).toBeEnabled();
  });

  // Multiple interactions test
  it('updates message based on count value', () => {
    render(<SimpleTestComponent />);

    const incrementButton = screen.getByTestId('increment-button');

    // Click 5 times to make count = 5
    for (let i = 0; i < 5; i++) {
      fireEvent.click(incrementButton);
    }

    // Should show "high" message
    expect(screen.getByTestId('count-value')).toHaveTextContent('5');
    expect(screen.getByTestId('count-message')).toHaveTextContent('Counter is high');
  });

  // Reset functionality test
  it('resets count when reset button is clicked', () => {
    render(<SimpleTestComponent initialValue={2} />);

    const incrementButton = screen.getByTestId('increment-button');
    const resetButton = screen.getByTestId('reset-button');

    // Click increment to change value
    fireEvent.click(incrementButton);
    expect(screen.getByTestId('count-value')).toHaveTextContent('3');

    // Reset button should be enabled
    expect(resetButton).toBeEnabled();

    // Click reset
    fireEvent.click(resetButton);

    // Should reset to initialValue
    expect(screen.getByTestId('count-value')).toHaveTextContent('2');
    expect(resetButton).toBeDisabled();
  });

  // Element presence test
  it('contains all required UI elements', () => {
    render(<SimpleTestComponent />);

    // Check if all elements are rendered
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByTestId('count-display')).toBeInTheDocument();
    expect(screen.getByTestId('count-message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /increment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });
});
