import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/section-placeholder';

export const metadata: Metadata = { title: 'Garments' };

export default function GarmentsPage() {
  return (
    <SectionPlaceholder
      eyebrow="Catalogue"
      title="Garment manager"
      description="Garment templates, colours, sizes and size charts, front/back media, fabric, fit and care, print-safe areas, placement rules, prices, stock and availability."
      task="TMS-F4-004"
    />
  );
}
