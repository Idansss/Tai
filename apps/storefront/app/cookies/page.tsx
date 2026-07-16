import type { Metadata } from 'next';
import { ContentPage } from '@/components/site/content-page';

export const metadata: Metadata = {
  title: 'Cookie policy',
  description: 'The cookies Tai Manic Studios uses and how to control them.',
};

export default function Page() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Cookie policy"
      intro="A short, honest account of the cookies we use. It’s a working draft to be reviewed by legal counsel before launch and doesn’t constitute legal advice."
      updated="July 2026"
      sections={[
        {
          heading: 'What cookies are',
          body: (
            <p>
              Cookies are small files stored by your browser. Some are essential for the site to
              work; others help us understand and improve how it’s used.
            </p>
          ),
        },
        {
          heading: 'What we use',
          body: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="text-ink">Essential:</span> keep you signed in, remember your bag
                and saved designs, and keep checkout secure. The site can’t work without these.
              </li>
              <li>
                <span className="text-ink">Preferences:</span> remember choices like your theme.
              </li>
              <li>
                <span className="text-ink">Analytics (optional):</span> anonymous, aggregated usage
                so we can improve the site. Only set if you allow them.
              </li>
            </ul>
          ),
        },
        {
          heading: 'Managing cookies',
          body: (
            <p>
              You can clear or block cookies in your browser settings. Blocking essential cookies
              will stop parts of the site, like your bag and checkout, from working properly.
            </p>
          ),
        },
        {
          heading: 'More detail',
          body: (
            <p>
              For how cookies fit into your wider data, see our{' '}
              <a
                href="/privacy"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                privacy policy
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
