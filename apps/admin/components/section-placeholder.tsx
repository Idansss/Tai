import { Badge, Eyebrow, Heading, Text } from '@tms/ui';

/**
 * Accessible placeholder for an admin section that will be built in a later F4
 * task. Keeps the shell navigable (no dead 404s) and honest about status.
 */
export function SectionPlaceholder({
  eyebrow,
  title,
  description,
  task,
}: {
  eyebrow: string;
  title: string;
  description: string;
  /** The F4 task that will deliver this section, e.g. "TMS-F4-002". */
  task: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          {title}
        </Heading>
        <Text tone="secondary" className="mt-2 max-w-2xl">
          {description}
        </Text>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-6">
        <Badge tone="neutral">Coming in {task}</Badge>
        <Text size="sm" tone="muted" className="mt-3">
          This section is scaffolded so navigation stays intact. It will be built out on the typed
          mock adapter, then wired to the real admin API when it lands.
        </Text>
      </div>
    </div>
  );
}
