import type { Metadata } from 'next';
import { ContentPage } from '@/components/site/content-page';

export const metadata: Metadata = {
  title: 'Returns & exchanges',
  description: 'How returns and exchanges work for made-to-order pieces, and what is eligible.',
};

export default function Page() {
  return (
    <ContentPage
      eyebrow="Help"
      title="Returns & exchanges"
      intro="Because every piece is made to order for you, our returns policy is built around fit and quality rather than change of mind."
      sections={[
        {
          heading: 'If something is wrong',
          body: (
            <p>
              If your piece arrives faulty, misprinted, or not what you ordered, we will put it
              right — a remake or a full refund, your choice. Contact us within 7 days of delivery
              with your order reference and a photo, and we will sort it quickly.
            </p>
          ),
        },
        {
          heading: 'Sizing & exchanges',
          body: (
            <p>
              Made-to-order pieces are printed just for you, so we can’t restock a return simply
              because the size wasn’t right. Please check the{' '}
              <a
                href="/size-guide"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                size guide
              </a>{' '}
              before ordering. If you’re between sizes or unsure, message us before you buy and
              we’ll help you choose.
            </p>
          ),
        },
        {
          heading: 'What isn’t eligible',
          body: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Change of mind on a correctly made piece.</li>
              <li>Ordering the wrong size when the size guide was available.</li>
              <li>Wear, wash or alteration after delivery.</li>
            </ul>
          ),
        },
        {
          heading: 'How to start a return',
          body: (
            <p>
              Email us from the{' '}
              <a
                href="/contact"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                contact
              </a>{' '}
              page with your order reference. This policy sits alongside your rights under Nigerian
              consumer law — it never limits them.
            </p>
          ),
        },
      ]}
    />
  );
}
