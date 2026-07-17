import { Badge } from '@tms/ui';
import { type DropStatus, dropStatusLabel, dropStatusTone } from '@/lib/drops';

/** Presentational status pill. Status is also conveyed by text, never colour alone. */
export function DropStatusBadge({ status }: { status: DropStatus }) {
  return (
    <Badge
      tone={dropStatusTone(status)}
      icon={<span aria-hidden className="size-1.5 rounded-full bg-current" />}
    >
      {dropStatusLabel(status)}
    </Badge>
  );
}
