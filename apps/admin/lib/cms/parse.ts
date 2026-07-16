import { ValidationError, type AnnouncementInput, type AnnouncementTone } from '@tms/site-content';

const TONES: AnnouncementTone[] = ['DEFAULT', 'INFO', 'SUCCESS', 'WARNING'];

function optionalDate(value: unknown, field: string): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string')
    throw new ValidationError('Invalid date.', { [field]: 'Invalid date.' });
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError('Invalid date.', { [field]: 'Use a valid date/time.' });
  }
  return date;
}

/** Parse an untrusted JSON body into a typed AnnouncementInput (throws ValidationError). */
export function parseAnnouncementInput(body: unknown): AnnouncementInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const tone = typeof b.tone === 'string' ? (b.tone as AnnouncementTone) : 'DEFAULT';
  return {
    message: typeof b.message === 'string' ? b.message : '',
    href: typeof b.href === 'string' ? b.href : null,
    linkLabel: typeof b.linkLabel === 'string' ? b.linkLabel : null,
    tone: TONES.includes(tone) ? tone : 'DEFAULT',
    startsAt: optionalDate(b.startsAt, 'startsAt'),
    endsAt: optionalDate(b.endsAt, 'endsAt'),
    sortOrder: typeof b.sortOrder === 'number' ? b.sortOrder : undefined,
  };
}
