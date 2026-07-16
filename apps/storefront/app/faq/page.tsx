import type { Metadata } from 'next';
import { Heading } from '@tms/ui';
import { ContentPage } from '@/components/site/content-page';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers to the questions we are asked most often about ordering and delivery.',
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Are pieces made to order?',
    a: (
      <p>
        Yes. Nothing is pre-printed, we print and finish your piece once you order, which is why a
        short production window applies before dispatch.
      </p>
    ),
  },
  {
    q: 'How long will my order take?',
    a: (
      <p>
        Roughly 2–4 working days to make, then 2–4 working days to deliver, depending on your state.
        Full detail is on the{' '}
        <a
          href="/delivery"
          className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
        >
          delivery
        </a>{' '}
        page.
      </p>
    ),
  },
  {
    q: 'How do I choose the right size?',
    a: (
      <p>
        Our classic tee runs true to size; size up for a relaxed or oversized fit. The{' '}
        <a
          href="/size-guide"
          className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
        >
          size guide
        </a>{' '}
        has full measurements.
      </p>
    ),
  },
  {
    q: 'Can I return or exchange a piece?',
    a: (
      <p>
        We’ll always fix a faulty or incorrect order. Because pieces are made to order, we can’t
        take change-of-mind returns, see{' '}
        <a
          href="/returns"
          className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
        >
          returns
        </a>{' '}
        for the details.
      </p>
    ),
  },
  {
    q: 'How do I pay?',
    a: (
      <p>
        Payments are in Naira through Flutterwave, card or bank transfer. You’ll see the full
        total, including delivery and VAT, before you confirm.
      </p>
    ),
  },
  {
    q: 'Can I put any artwork on any garment?',
    a: (
      <p>
        Almost, each artwork is approved for a specific set of garments, colours and placements so
        the print always looks its best. The{' '}
        <a
          href="/design-studio"
          className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
        >
          Design Studio
        </a>{' '}
        only offers the combinations we’ve approved.
      </p>
    ),
  },
];

export default function Page() {
  return (
    <ContentPage
      eyebrow="Help"
      title="Frequently asked"
      intro="The questions we hear most often. If yours isn’t here, the studio is a message away."
    >
      <Heading as={2} size="md" className="mb-4 text-xs uppercase tracking-[0.12em] text-muted">
        Common questions
      </Heading>
      <div className="divide-y divide-line rounded-[var(--radius-lg)] border border-line">
        {FAQS.map((item, i) => (
          <details key={i} className="group px-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] [&::-webkit-details-marker]:hidden">
              <span className="font-medium">{item.q}</span>
              <span
                className="shrink-0 text-muted transition-transform group-open:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <div className="pb-4 text-ink-2 leading-relaxed">{item.a}</div>
          </details>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">
        Still stuck? Reach us from the{' '}
        <a
          href="/contact"
          className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
        >
          contact
        </a>{' '}
        page.
      </p>
    </ContentPage>
  );
}
