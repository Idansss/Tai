import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export const CurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
export const MoneyMinorSchema = z.number().int().nonnegative();
