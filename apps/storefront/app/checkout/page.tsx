import { Container, Eyebrow, Heading } from '@tms/ui';
import type { Metadata } from 'next';
import { CheckoutFlow } from '@/components/checkout/checkout-flow';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Enter your contact and delivery details and place your order.',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const deliveryOptions = await dataProvider.getDeliveryOptions();

  return (
    <Container className="py-10">
      <header className="mb-8">
        <Eyebrow>Checkout</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Checkout
        </Heading>
      </header>
      <CheckoutFlow deliveryOptions={deliveryOptions} />
    </Container>
  );
}
