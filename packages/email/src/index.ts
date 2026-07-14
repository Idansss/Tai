export interface EmailMessage {
  to: string;
  template: string;
  variables: Readonly<Record<string, string>>;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ messageId: string }>;
}
