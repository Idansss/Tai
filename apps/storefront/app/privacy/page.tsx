import type { Metadata } from 'next';
import { ContentPage } from '@/components/site/content-page';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How Tai Manic Studios collects, uses and protects your personal data.',
};

export default function Page() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Privacy policy"
      intro="This is a plain-language summary of how we handle your data. It’s a working draft to be reviewed by legal counsel before launch and doesn’t constitute legal advice."
      updated="July 2026"
      sections={[
        {
          heading: 'What we collect',
          body: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Contact details you give us — name, email, phone and delivery address.</li>
              <li>Order and payment information needed to fulfil and support your purchases.</li>
              <li>Designs you save and items you wishlist when signed in.</li>
              <li>Basic usage data (via cookies) to keep the site working and improve it.</li>
            </ul>
          ),
        },
        {
          heading: 'How we use it',
          body: (
            <p>
              We use your data to process and deliver orders, provide support, keep your account and
              saved designs, and — only if you opt in — send you news about releases. We do not sell
              your personal data.
            </p>
          ),
        },
        {
          heading: 'Who we share it with',
          body: (
            <p>
              We share only what’s necessary with the providers who help us operate: our payment
              processor (Flutterwave) to take payment, and our delivery partners to ship your order.
              Each handles your data under their own terms.
            </p>
          ),
        },
        {
          heading: 'Your choices',
          body: (
            <p>
              You can access, correct or delete your account data, and unsubscribe from marketing at
              any time. To make a request, email{' '}
              <a
                href="mailto:privacy@taimanicstudios.com"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                privacy@taimanicstudios.com
              </a>
              .
            </p>
          ),
        },
        {
          heading: 'Cookies',
          body: (
            <p>
              We use a small number of cookies — see our{' '}
              <a
                href="/cookies"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                cookie policy
              </a>{' '}
              for what they do and how to control them.
            </p>
          ),
        },
      ]}
    />
  );
}
