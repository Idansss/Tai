import type { Metadata } from 'next';
import { ContentPage } from '@/components/site/content-page';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Reach the studio for order support, wholesale enquiries or press.',
};

export default function Page() {
  return (
    <ContentPage
      eyebrow="Help"
      title="Contact the studio"
      intro="Whether it’s an order question, a wholesale enquiry or a press request, a real person at the studio will get back to you."
      sections={[
        {
          heading: 'Order support',
          body: (
            <p>
              For anything about an existing order, email{' '}
              <a
                href="mailto:hello@taimanicstudios.com"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                hello@taimanicstudios.com
              </a>{' '}
              with your order reference. You’ll find your reference and live status in your{' '}
              <a
                href="/account/orders"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                account
              </a>
              .
            </p>
          ),
        },
        {
          heading: 'Wholesale & collaborations',
          body: (
            <p>
              Interested in stocking the work or collaborating on a piece? Email{' '}
              <a
                href="mailto:studio@taimanicstudios.com"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                studio@taimanicstudios.com
              </a>{' '}
              with a little about you and what you have in mind.
            </p>
          ),
        },
        {
          heading: 'Press',
          body: (
            <p>
              For press and images, reach{' '}
              <a
                href="mailto:press@taimanicstudios.com"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                press@taimanicstudios.com
              </a>
              .
            </p>
          ),
        },
        {
          heading: 'Response time',
          body: (
            <p>
              We aim to reply within one to two working days. A contact form and live chat are on
              the way, for now, email is the fastest route to the studio.
            </p>
          ),
        },
      ]}
    />
  );
}
