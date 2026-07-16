import type { Metadata } from 'next';
import { ContentPage } from '@/components/site/content-page';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Tai Manic Studios is an art-led label where original drawings lead and the garment follows.',
};

export default function Page() {
  return (
    <ContentPage
      eyebrow="Studio"
      title="About the studio"
      intro="Tai Manic Studios is an art-led label. Every piece begins as an original drawing, the garment is simply how the work travels into the world."
      sections={[
        {
          heading: 'What we make',
          body: (
            <>
              <p>
                We start with the artwork, not the product. Each design is drawn by hand, given a
                title and a short story, then matched to a small set of approved garments, the
                cuts, fabrics and print methods we know do the work justice.
              </p>
              <p>
                Because the art leads, the same drawing can live on a classic tee, an oversized cut
                or a heavyweight hoodie. You choose the garment, colour, size and where the artwork
                sits; we make it to order.
              </p>
            </>
          ),
        },
        {
          heading: 'Made to order, made to last',
          body: (
            <p>
              Nothing sits in a warehouse waiting to be discounted. Pieces are printed and finished
              once you order, on mid- to heavy-weight cotton chosen to hold colour and shape. It
              means a little more patience at checkout and a lot less waste.
            </p>
          ),
        },
        {
          heading: 'Where we work',
          body: (
            <p>
              We design, print and ship from Lagos, delivering across Nigeria. Prices are in Naira,
              payment runs through Flutterwave, and orders travel with our delivery partners, the
              details are on our{' '}
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
      ]}
    />
  );
}
