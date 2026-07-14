import { describe, expect, it } from 'vitest';
import {
  type CheckoutForm,
  computeOrderTotals,
  isValidEmail,
  isValidPhone,
  validateCheckout,
  validateContact,
  validateDelivery,
  VAT_RATE,
} from './checkout';

describe('field validators', () => {
  it('validates email', () => {
    expect(isValidEmail('jess@example.com')).toBe(true);
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });

  it('validates Nigerian phone formats', () => {
    expect(isValidPhone('08031234567')).toBe(true);
    expect(isValidPhone('+2348031234567')).toBe(true);
    expect(isValidPhone('080 3123 4567')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
  });
});

describe('validateContact', () => {
  it('flags missing and malformed fields', () => {
    expect(validateContact({ email: '', phone: '' })).toEqual({
      email: expect.any(String),
      phone: expect.any(String),
    });
    expect(validateContact({ email: 'bad', phone: '08031234567' })).toHaveProperty('email');
  });

  it('passes valid contact details', () => {
    expect(validateContact({ email: 'jess@example.com', phone: '08031234567' })).toEqual({});
  });
});

describe('validateDelivery', () => {
  const valid = {
    fullName: 'Jesse L',
    addressLine1: '1 Studio Way',
    addressLine2: '',
    city: 'Lagos',
    state: 'Lagos',
    deliveryOptionId: 'standard',
  };

  it('passes a complete address', () => {
    expect(validateDelivery(valid)).toEqual({});
  });

  it('requires name, address, city, state and a delivery method', () => {
    const errors = validateDelivery({ ...valid, fullName: '', deliveryOptionId: '' });
    expect(errors).toHaveProperty('fullName');
    expect(errors).toHaveProperty('deliveryOptionId');
  });
});

describe('validateCheckout', () => {
  it('namespaces errors by section', () => {
    const form: CheckoutForm = {
      contact: { email: '', phone: '' },
      delivery: {
        fullName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        deliveryOptionId: '',
      },
      paymentMethod: 'card',
    };
    const errors = validateCheckout(form);
    expect(errors).toHaveProperty('contact.email');
    expect(errors).toHaveProperty('delivery.fullName');
  });
});

describe('computeOrderTotals', () => {
  it('adds VAT on discounted goods plus delivery', () => {
    const totals = computeOrderTotals({
      subtotalMinor: 1000000,
      discountMinor: 100000,
      deliveryMinor: 250000,
    });
    // goods = 900000; tax = 7.5% = 67500; total = 900000 + 250000 + 67500
    expect(totals.taxMinor).toBe(Math.round(900000 * VAT_RATE));
    expect(totals.totalMinor).toBe(900000 + 250000 + 67500);
  });

  it('never lets the discount exceed the subtotal', () => {
    const totals = computeOrderTotals({
      subtotalMinor: 100000,
      discountMinor: 999999,
      deliveryMinor: 0,
    });
    expect(totals.discountMinor).toBe(100000);
    expect(totals.taxMinor).toBe(0);
    expect(totals.totalMinor).toBe(0);
  });
});
