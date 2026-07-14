import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button.js';

describe('Button', () => {
  it('renders its accessible label', () => {
    render(<Button>Add to cart</Button>);
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeInTheDocument();
  });

  it('is disabled and marked busy while loading', () => {
    render(<Button loading>Save design</Button>);
    const button = screen.getByRole('button', { name: /save design/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('stays disabled when explicitly disabled', () => {
    render(<Button disabled>Checkout</Button>);
    expect(screen.getByRole('button', { name: /checkout/i })).toBeDisabled();
  });

  it('applies the variant class', () => {
    render(<Button variant="danger">Remove</Button>);
    expect(screen.getByRole('button', { name: /remove/i }).className).toContain('bg-error');
  });
});
