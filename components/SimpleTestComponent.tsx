import { useState } from 'react';

interface SimpleTestComponentProps {
  initialValue?: number;
  label?: string;
}

/**
 * A simple component for testing React Testing Library setup with React 19
 */
export default function SimpleTestComponent({
  initialValue = 0,
  label = 'Counter'
}: SimpleTestComponentProps) {
  const [count, setCount] = useState(initialValue);
  
  const handleIncrement = () => {
    setCount(prev => prev + 1);
  };
  
  const handleReset = () => {
    setCount(initialValue);
  };
  
  return (
    <div className="simple-test-container" data-testid="simple-test-container">
      <h2 className="simple-test-title">{label}</h2>
      
      <div className="simple-test-value" data-testid="count-display">
        Current value: <span data-testid="count-value">{count}</span>
      </div>
      
      <div className="simple-test-message" data-testid="count-message">
        {count === 0 ? (
          <p className="zero-message">Counter is zero</p>
        ) : count < 5 ? (
          <p className="low-message">Counter is low</p>
        ) : (
          <p className="high-message">Counter is high</p>
        )}
      </div>
      
      <div className="simple-test-actions">
        <button 
          onClick={handleIncrement} 
          className="increment-button"
          data-testid="increment-button"
        >
          Increment
        </button>
        <button 
          onClick={handleReset} 
          className="reset-button"
          data-testid="reset-button"
          disabled={count === initialValue}
        >
          Reset
        </button>
      </div>
    </div>
  );
}