import { Badge, Card, Eyebrow, Heading, Text } from '@tms/ui';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

const metrics = [
  { label: 'Revenue (30d)', value: '—', note: 'Awaiting orders API' },
  { label: 'Paid orders', value: '—', note: 'Awaiting orders API' },
  { label: 'Production queue', value: '—', note: 'Awaiting production API' },
  { label: 'Delivery exceptions', value: '—', note: 'Awaiting shipping API' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>Overview</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Dashboard
        </Heading>
        <Text tone="secondary" className="mt-2">
          Operational summary. Metrics are placeholders until Codex publishes the admin read
          endpoints; the shell, navigation and states are in place.
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <Text size="sm" tone="muted">
              {m.label}
            </Text>
            <p className="mt-2 font-display text-3xl tabular-nums text-ink">{m.value}</p>
            <div className="mt-3">
              <Badge tone="neutral">{m.note}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
