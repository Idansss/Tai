import { describe, expect, it } from 'vitest';
import {
  type Account,
  addAccount,
  findAccount,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  validateLogin,
  validateRegister,
} from './auth';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Jesse@Example.COM ')).toBe('jesse@example.com');
  });
});

describe('validateRegister', () => {
  const valid = {
    name: 'Jesse',
    email: 'jesse@example.com',
    password: 'password123',
    confirm: 'password123',
  };

  it('passes a complete, valid form', () => {
    expect(validateRegister(valid)).toEqual({});
  });

  it('requires a name, valid email, min-length password and a matching confirm', () => {
    const errors = validateRegister({ name: '', email: 'bad', password: 'short', confirm: 'nope' });
    expect(errors).toHaveProperty('name');
    expect(errors).toHaveProperty('email');
    expect(errors.password).toContain(String(MIN_PASSWORD_LENGTH));
    expect(errors).toHaveProperty('confirm');
  });
});

describe('validateLogin', () => {
  it('requires an email and password', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: expect.any(String),
      password: expect.any(String),
    });
    expect(validateLogin({ email: 'jesse@example.com', password: 'x' })).toEqual({});
  });
});

describe('accounts', () => {
  const accounts: Account[] = [{ email: 'jesse@example.com', name: 'Jesse' }];

  it('finds an account case-insensitively', () => {
    expect(findAccount(accounts, 'JESSE@example.com')?.name).toBe('Jesse');
    expect(findAccount(accounts, 'nobody@example.com')).toBeUndefined();
  });

  it('adds a normalised account', () => {
    const next = addAccount(accounts, { email: '  New@Example.com ', name: '  Sam  ' });
    expect(next).toHaveLength(2);
    expect(findAccount(next, 'new@example.com')).toEqual({ email: 'new@example.com', name: 'Sam' });
  });
});
