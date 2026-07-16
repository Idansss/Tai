import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string;
  template: 'auth-email-verification' | 'auth-password-reset';
  variables: Readonly<Record<string, string>>;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ messageId: string }>;
}

export interface SmtpEmailProviderOptions {
  smtpUrl: string;
  from: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderEmailMessage(message: EmailMessage): RenderedEmail {
  const actionUrl = message.variables.actionUrl;
  if (!actionUrl) {
    throw new Error('The authentication email action URL is required.');
  }

  const escapedActionUrl = escapeHtml(actionUrl);
  if (message.template === 'auth-email-verification') {
    return {
      subject: 'Verify your Tai Manic Studios email',
      text: `Verify your email by opening this link: ${actionUrl}`,
      html: `<p>Verify your email to finish creating your Tai Manic Studios account.</p><p><a href="${escapedActionUrl}">Verify email</a></p>`,
    };
  }

  return {
    subject: 'Reset your Tai Manic Studios password',
    text: `Reset your password by opening this link: ${actionUrl}`,
    html: `<p>A password reset was requested for your Tai Manic Studios account.</p><p><a href="${escapedActionUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  };
}

export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;

  constructor(private readonly options: SmtpEmailProviderOptions) {
    this.transporter = nodemailer.createTransport(options.smtpUrl);
  }

  async send(message: EmailMessage): Promise<{ messageId: string }> {
    const rendered = renderEmailMessage(message);
    const result = await this.transporter.sendMail({
      from: this.options.from,
      to: message.to,
      ...rendered,
    });

    return { messageId: result.messageId };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
