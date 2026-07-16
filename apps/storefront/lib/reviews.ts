import type { Review, ReviewStats } from './data/types';

/**
 * Pure domain logic for reviews & ratings (TMS-F5-004): aggregate a set of
 * reviews into stats + a star distribution, derive the bar percentages, and
 * validate a write-a-review submission. Pure + unit-tested so the summary shown
 * on the product/artwork page always matches the underlying reviews. The real
 * read/write/moderation flow is server-authoritative (TMS-FBR-008).
 */

export const RATING_VALUES = [1, 2, 3, 4, 5] as const;
export const MIN_TITLE = 3;
export const MIN_BODY = 10;

/** Aggregate reviews into an average, a count, and a per-star distribution. */
export function summariseReviews(reviews: Review[]): ReviewStats {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  for (const review of reviews) {
    const star = clampStar(review.rating);
    distribution[star] = (distribution[star] ?? 0) + 1;
    total += star;
  }
  const count = reviews.length;
  const average = count === 0 ? 0 : total / count;
  return { average, count, distribution };
}

/** Percentage (0–100) of reviews at each star, for the distribution bars. */
export function distributionPercents(stats: ReviewStats): Record<number, number> {
  const out: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (stats.count === 0) return out;
  for (const star of RATING_VALUES) {
    out[star] = Math.round(((stats.distribution[star] ?? 0) / stats.count) * 100);
  }
  return out;
}

/** Average rounded to one decimal place, e.g. 4.3, for display. */
export function formatAverage(average: number): string {
  return average.toFixed(1);
}

function clampStar(rating: number): number {
  const rounded = Math.round(rating);
  return Math.min(5, Math.max(1, rounded));
}

export interface ReviewInput {
  rating: number;
  title: string;
  body: string;
  author: string;
}

export type ReviewFieldErrors = Partial<Record<keyof ReviewInput, string>>;

export type ReviewValidation = { ok: true } | { ok: false; errors: ReviewFieldErrors };

/** Validate a write-a-review submission. Pure, the form and any API share it. */
export function validateReviewInput(input: ReviewInput): ReviewValidation {
  const errors: ReviewFieldErrors = {};
  if (!RATING_VALUES.includes(input.rating as (typeof RATING_VALUES)[number])) {
    errors.rating = 'Choose a rating from 1 to 5 stars.';
  }
  if (input.title.trim().length < MIN_TITLE) {
    errors.title = `Add a short title (at least ${MIN_TITLE} characters).`;
  }
  if (input.body.trim().length < MIN_BODY) {
    errors.body = `Tell us a little more (at least ${MIN_BODY} characters).`;
  }
  if (input.author.trim().length === 0) {
    errors.author = 'Add your name.';
  }
  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}
