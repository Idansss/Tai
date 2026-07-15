import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { Alert } from './alert.js';
import { Badge } from './badge.js';
import { Button } from './button.js';
import { EmptyState } from './empty-state.js';
import { IconButton } from './icon-button.js';

async function noViolations(node: HTMLElement): Promise<void> {
  const results = await axe.run(node, {
    // jsdom cannot compute colour rendering; contrast is covered by tokens.spec.ts.
    rules: { 'color-contrast': { enabled: false } },
  });
  const summary = results.violations.map((v) => `${v.id}: ${v.help}`).join('\n');
  expect(summary).toBe('');
}

describe('primitive accessibility', () => {
  it('Button has no axe violations', async () => {
    const { container } = render(<Button>Continue</Button>);
    await noViolations(container);
  });

  it('IconButton exposes an accessible name', async () => {
    const { container, getByRole } = render(
      <IconButton label="Open menu" icon={<svg aria-hidden />} />,
    );
    expect(getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    await noViolations(container);
  });

  it('Alert and Badge and EmptyState have no axe violations', async () => {
    const { container } = render(
      <div>
        <Alert tone="error" title="Payment failed">
          Your card was declined.
        </Alert>
        <Badge tone="success">In stock</Badge>
        <EmptyState title="No artworks found" description="Try clearing your filters." />
      </div>,
    );
    await noViolations(container);
  });
});
