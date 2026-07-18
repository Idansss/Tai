import { Badge, Text } from '@tms/ui';
import { AdminPageHeader } from '@/components/admin-page-header';

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
      <AdminPageHeader eyebrow={eyebrow} title={title} lead={description} />
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
