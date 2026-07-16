import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { CheckoutFlow } from '@/components/checkout/checkout-flow';
import { PageHeading } from '@/components/site/page-heading';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Enter your contact and delivery details and place your order.',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const deliveryOptions = await dataProvider.getDeliveryOptions();

  return (
    <Container className="py-10 sm:py-12">
      <div className="mb-8">
        <PageHeading
          eyebrow="Checkout"
          title="Checkout"
          lead="Enter your details and place your order. Delivery and tax are confirmed before payment."
        />
      </div>
      <CheckoutFlow deliveryOptions={deliveryOptions} />
    </Container>
  );
}
