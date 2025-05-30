import React from 'react';

import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';

import ExplorePage from '../../app/explore/page.js';
import { render } from '../utils/test-utils.js';

// Don't mock, use real translations

describe('ExplorePage', () => {
  it('renders the page title', () => {
    render(<ExplorePage />);
    expect(screen.getByText('explore our translations')).toBeInTheDocument();
  });

  it('renders available books with read now button', () => {
    render(<ExplorePage />);

    // Find an available book (e.g., The Iliad)
    const availableBook = screen.getByText('the iliad').closest('.card');
    expect(availableBook).toBeInTheDocument();

    // Check for read now button
    const readButton = availableBook
      ? availableBook.querySelector('a[href="/reading-room/the-iliad"]')
      : null;
    expect(readButton).toBeInTheDocument();
    expect(readButton).toHaveTextContent('read now');

    // Should not have WIP badge
    expect(availableBook?.querySelector('.bg-peachy')).not.toBeInTheDocument();
  });

  it('renders coming soon books with disabled button and WIP badge', () => {
    render(<ExplorePage />);

    // Find a coming soon book (e.g., The Republic)
    const comingSoonBook = screen.getByText('the republic').closest('.card');
    expect(comingSoonBook).toBeInTheDocument();

    // Check for coming soon button
    const comingSoonButton = comingSoonBook
      ? comingSoonBook.querySelector('button[title="coming soon"]')
      : null;
    expect(comingSoonButton).toBeInTheDocument();
    expect(comingSoonButton).toHaveTextContent('coming soon');
    expect(comingSoonButton).toHaveClass('cursor-not-allowed');

    // Should have grayscale and opacity
    expect(comingSoonBook).toHaveClass('opacity-70', 'grayscale');

    // Should have WIP badge
    const wipBadge = comingSoonBook?.querySelector('.bg-peachy');
    expect(wipBadge).toBeInTheDocument();
    expect(wipBadge).toHaveTextContent('WIP');
  });

  it('renders purchase link when available', () => {
    render(<ExplorePage />);

    // Find a book with purchase link (e.g., The Iliad)
    const purchaseBook = screen.getByText('the iliad').closest('.card');
    expect(purchaseBook).toBeInTheDocument();

    // Check for buy now button
    const buyButton = purchaseBook
      ? purchaseBook.querySelector('a[href="https://a.co/d/3Jgk26x"]')
      : null;
    expect(buyButton).toBeInTheDocument();
    expect(buyButton).toHaveTextContent('buy now');
    expect(buyButton).toHaveAttribute('target', '_blank');
    expect(buyButton).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders all books in a grid layout', () => {
    render(<ExplorePage />);

    // Check that container has grid classes
    const gridContainer = screen.getByText('explore our translations').nextElementSibling;
    expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');

    // Check that some books are rendered
    expect(screen.getByText('the iliad')).toBeInTheDocument();
    expect(screen.getByText('the odyssey')).toBeInTheDocument();
    expect(screen.getByText('the declaration of independence')).toBeInTheDocument();
    expect(screen.getByText('the republic')).toBeInTheDocument();
  });

  it('includes the Declaration of Independence as available', () => {
    render(<ExplorePage />);

    // Find the Declaration of Independence
    const declaration = screen.getByText('the declaration of independence').closest('.card');
    expect(declaration).toBeInTheDocument();

    // Should be available, not coming soon
    const readButton = declaration
      ? declaration.querySelector('a[href="/reading-room/declaration-of-independence"]')
      : null;
    expect(readButton).toBeInTheDocument();
    expect(readButton).toHaveTextContent('read now');

    // Should not have WIP badge or be greyed out
    expect(declaration?.querySelector('.bg-peachy')).not.toBeInTheDocument();
    expect(declaration).not.toHaveClass('opacity-70', 'grayscale');
  });
});
