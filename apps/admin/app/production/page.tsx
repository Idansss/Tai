import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/section-placeholder';

export const metadata: Metadata = { title: 'Production' };

export default function ProductionPage() {
  return (
    <SectionPlaceholder
      eyebrow="Operations"
      title="Production & quality"
      description="Production queue with artwork preview, garment, colour, size, placement and quantity, print-file access, printing status, quality-check result, reprint and internal notes."
      task="TMS-F4-005"
    />
  );
}
