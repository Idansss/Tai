/**
 * Checkout domain — pure and framework-free so validation and totals can be
 * unit-tested and reused by the checkout flow and review surfaces.
 *
 * Money remains server-authoritative (MASTER_PRODUCT_SPEC §"server is
 * authoritative for … tax, shipping, and totals"). Until the checkout API
 * exists these helpers compute a *preview* order total — delivery fees come
 * from the mock `getDeliveryOptions()` and VAT is a mock rate. Backend gap
 * tracked as TMS-FBR-004 in FRONTEND_TO_BACKEND.md.
 */

export interface ContactDetails {
  email: string;
  phone: string;
}

export interface DeliveryDetails {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  deliveryOptionId: string;
}

export type PaymentMethod = 'card' | 'transfer';

export interface CheckoutForm {
  contact: ContactDetails;
  delivery: DeliveryDetails;
  paymentMethod: PaymentMethod;
}

export const EMPTY_CHECKOUT_FORM: CheckoutForm = {
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

/** Nigerian states + FCT, for the delivery address selector. */
export const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT — Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const;

/** Mock Nigerian VAT rate applied to goods after discount. */
export const VAT_RATE = 0.075;

/** Field-keyed validation errors; empty object means the section is valid. */
export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Accepts Nigerian mobile formats: 0803…, +23480…, with spaces/dashes. */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/[\s-]/g, '');
  return /^(\+?234|0)\d{9,10}$/.test(digits);
}

export function validateContact(contact: ContactDetails): FieldErrors {
  const errors: FieldErrors = {};
  if (!contact.email.trim()) errors.email = 'Enter your email address.';
  else if (!isValidEmail(contact.email)) errors.email = 'Enter a valid email address.';
  if (!contact.phone.trim()) errors.phone = 'Enter your phone number.';
  else if (!isValidPhone(contact.phone)) errors.phone = 'Enter a valid Nigerian phone number.';
  return errors;
}

export function validateDelivery(delivery: DeliveryDetails): FieldErrors {
  const errors: FieldErrors = {};
  if (!delivery.fullName.trim()) errors.fullName = 'Enter the recipient’s full name.';
  if (!delivery.addressLine1.trim()) errors.addressLine1 = 'Enter your street address.';
  if (!delivery.city.trim()) errors.city = 'Enter your city or town.';
  if (!delivery.state.trim()) errors.state = 'Select your state.';
  if (!delivery.deliveryOptionId) errors.deliveryOptionId = 'Choose a delivery method.';
  return errors;
}

/** All blocking errors across the form, namespaced by section. */
export function validateCheckout(form: CheckoutForm): FieldErrors {
  const contact = validateContact(form.contact);
  const delivery = validateDelivery(form.delivery);
  return {
    ...Object.fromEntries(Object.entries(contact).map(([k, v]) => [`contact.${k}`, v])),
    ...Object.fromEntries(Object.entries(delivery).map(([k, v]) => [`delivery.${k}`, v])),
  };
}

export interface OrderTotals {
  subtotalMinor: number;
  discountMinor: number;
  deliveryMinor: number;
  taxMinor: number;
  totalMinor: number;
}

/** Preview order total: (subtotal − discount) + delivery + VAT on goods. */
export function computeOrderTotals(input: {
  subtotalMinor: number;
  discountMinor: number;
  deliveryMinor: number;
}): OrderTotals {
  const subtotalMinor = Math.max(0, input.subtotalMinor);
  const discountMinor = Math.min(subtotalMinor, Math.max(0, input.discountMinor));
  const deliveryMinor = Math.max(0, input.deliveryMinor);
  const goods = subtotalMinor - discountMinor;
  const taxMinor = Math.round(goods * VAT_RATE);
  return {
    subtotalMinor,
    discountMinor,
    deliveryMinor,
    taxMinor,
    totalMinor: goods + deliveryMinor + taxMinor,
  };
}
