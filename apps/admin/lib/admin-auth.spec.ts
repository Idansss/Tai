import { describe, expect, it } from 'vitest';
import { isValidEmail, nameFromEmail, normalizeEmail, validateLogin } from './admin-auth';

describe('isValidEmail', () => {
  it('accepts well-formed addresses and rejects malformed ones', () => {
    expect(isValidEmail('ada@tms.studio')).toBe(true);
    expect(isValidEmail('  ada@tms.studio  ')).toBe(true);
    expect(isValidEmail('ada@')).toBe(false);
    expect(isValidEmail('nope')).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Ada@TMS.Studio ')).toBe('ada@tms.studio');
  });
});

describe('nameFromEmail', () => {
  it('title-cases the local part across separators', () => {
    expect(nameFromEmail('ada.okoro@tms.studio')).toBe('Ada Okoro');
    expect(nameFromEmail('chidi-nwosu@tms.studio')).toBe('Chidi Nwosu');
    expect(nameFromEmail('emeka@tms.studio')).toBe('Emeka');
  });
});

describe('validateLogin', () => {
  it('requires a valid email and a password', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Enter your work email.',
      password: 'Enter your password.',
    });
    expect(validateLogin({ email: 'bad', password: 'x' })).toEqual({
      email: 'Enter a valid email address.',
    });
    expect(validateLogin({ email: 'ada@tms.studio', password: 'secret' })).toEqual({});
  });
});
