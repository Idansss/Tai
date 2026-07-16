import { describe, expect, it } from 'vitest';

import { renderEmailMessage } from './index.js';

describe('authentication email rendering', () => {
  it('renders verification links without allowing HTML injection', () => {
    const rendered = renderEmailMessage({
      to: 'customer@example.com',
      template: 'auth-email-verification',
      variables: { actionUrl: 'https://example.com/verify?token=<secret>&next=account' },
    });

    expect(rendered.subject).toContain('Verify');
    expect(rendered.text).toContain('token=<secret>');
    expect(rendered.html).toContain('token=&lt;secret&gt;&amp;next=account');
    expect(rendered.html).not.toContain('token=<secret>');
  });

  it('requires an action URL for recovery email templates', () => {
    expect(() =>
      renderEmailMessage({
        to: 'customer@example.com',
        template: 'auth-password-reset',
        variables: {},
      }),
    ).toThrow('action URL is required');
  });
});
