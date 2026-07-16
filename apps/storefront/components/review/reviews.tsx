'use client';

import { Alert, Button, EmptyState, Heading, Text } from '@tms/ui';
import { BadgeCheck, MessageSquare, Star } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useAuth } from '@/components/account/auth-provider';
import type { Review, ReviewCollection, ReviewTargetType } from '@/lib/data';
import {
  distributionPercents,
  formatAverage,
  RATING_VALUES,
  type ReviewFieldErrors,
  summariseReviews,
  validateReviewInput,
} from '@/lib/reviews';
import { RatingStars } from './rating-stars';

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );

/**
 * Reviews & ratings section (TMS-F5-004). Renders the aggregate summary + star
 * distribution, the review list (with a verified-purchase badge), and a
 * write-a-review form. Writes are preview-only — a submitted review is prepended
 * locally so the customer sees it, but nothing is sent to the server or
 * moderated yet (TMS-FBR-008). The verified-purchase badge is never granted to a
 * locally-added review.
 */
export function Reviews({
  targetType,
  targetLabel,
  initial,
}: {
  targetType: ReviewTargetType;
  targetLabel: string;
  initial: ReviewCollection;
}) {
  const [items, setItems] = useState<Review[]>(initial.items);
  const stats = useMemo(() => summariseReviews(items), [items]);
  const percents = distributionPercents(stats);

  return (
    <section aria-labelledby="reviews-title" className="border-t border-line pt-10">
      <Heading id="reviews-title" as={2} size="md">
        Reviews
      </Heading>

      {stats.count > 0 ? (
        <div className="mt-6 grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="text-center sm:text-left">
            <p className="font-display text-4xl text-ink">{formatAverage(stats.average)}</p>
            <RatingStars value={stats.average} size="lg" />
            <p className="mt-1 text-sm text-muted">
              {stats.count} {stats.count === 1 ? 'review' : 'reviews'}
            </p>
          </div>
          <ul className="space-y-1.5">
            {[...RATING_VALUES].reverse().map((star) => (
              <li key={star} className="flex items-center gap-3 text-sm">
                <span className="flex w-12 shrink-0 items-center gap-1 text-muted">
                  {star} <Star className="size-3.5" aria-hidden />
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-canvas-2">
                  <span
                    className="block h-full rounded-full bg-warning"
                    style={{ width: `${percents[star]}%` }}
                  />
                </span>
                <span className="w-9 shrink-0 text-right text-muted">
                  {stats.distribution[star] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          className="mt-6"
          icon={<MessageSquare aria-hidden />}
          title="No reviews yet"
          description={`Be the first to review ${targetLabel}.`}
        />
      )}

      {items.length > 0 ? (
        <ul className="mt-8 space-y-6">
          {items.map((review) => (
            <li key={review.id} className="border-t border-line pt-6 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <RatingStars value={review.rating} label={`${review.rating} out of 5 stars`} />
                <p className="font-medium text-ink">{review.title}</p>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span>{review.author}</span>
                <span aria-hidden>·</span>
                <span>{fmtDate(review.createdAt)}</span>
                {review.verifiedPurchase ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    Verified purchase
                  </span>
                ) : null}
              </div>
              <Text tone="secondary" className="mt-2 text-sm">
                {review.body}
              </Text>
            </li>
          ))}
        </ul>
      ) : null}

      <WriteReviewForm
        targetType={targetType}
        onSubmitted={(review) => setItems((prev) => [review, ...prev])}
      />
    </section>
  );
}

function WriteReviewForm({
  targetType,
  onSubmitted,
}: {
  targetType: ReviewTargetType;
  onSubmitted: (review: Review) => void;
}) {
  const { user, ready } = useAuth();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [author, setAuthor] = useState('');
  const [touchedAuthor, setTouchedAuthor] = useState(false);
  const [errors, setErrors] = useState<ReviewFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const titleId = useId();
  const bodyId = useId();
  const authorId = useId();

  // Prefill the name from the session, unless the customer has typed their own.
  const effectiveAuthor = author === '' && !touchedAuthor && ready && user ? user.name : author;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input = { rating, title, body, author: effectiveAuthor };
    const result = validateReviewInput(input);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    // Preview-only: no network. Prepend locally so the review is visible.
    const review: Review = {
      id: `local-${Date.now()}`,
      rating,
      title: title.trim(),
      body: body.trim(),
      author: effectiveAuthor.trim(),
      createdAt: new Date().toISOString(),
      verifiedPurchase: false,
    };
    onSubmitted(review);
    setSubmitting(false);
    setDone(true);
    setRating(0);
    setTitle('');
    setBody('');
    setAuthor('');
    setTouchedAuthor(false);
  }

  const noun = targetType === 'product' ? 'this piece' : 'this artwork';

  return (
    <div className="mt-10 rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-6">
      <Heading as={3} size="md">
        Write a review
      </Heading>
      <Text tone="secondary" className="mt-1 text-sm">
        Share how {noun} looks and wears.
      </Text>

      {done ? (
        <Alert tone="success" title="Thanks for your review" className="mt-4">
          <p>
            It’s shown above on this device. As a preview it isn’t sent to the studio or moderated
            yet, so it won’t appear for other shoppers (TMS-FBR-008).
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setDone(false)}
          >
            Write another
          </Button>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-ink">Your rating</legend>
            <div className="mt-2 flex gap-1">
              {RATING_VALUES.map((star) => (
                <label key={star} className="cursor-pointer">
                  <input
                    type="radio"
                    name="rating"
                    value={star}
                    checked={rating === star}
                    onChange={() => {
                      setRating(star);
                      if (errors.rating) setErrors((e) => ({ ...e, rating: undefined }));
                    }}
                    className="sr-only"
                  />
                  <span className="sr-only">
                    {star} {star === 1 ? 'star' : 'stars'}
                  </span>
                  <Star
                    aria-hidden
                    className={`size-7 transition ${
                      star <= rating
                        ? 'fill-warning text-warning'
                        : 'text-line-2 hover:text-warning'
                    }`}
                  />
                </label>
              ))}
            </div>
            {errors.rating ? (
              <p role="alert" className="mt-1 text-sm text-error">
                {errors.rating}
              </p>
            ) : null}
          </fieldset>

          <Field
            id={titleId}
            label="Title"
            value={title}
            onChange={(v) => {
              setTitle(v);
              if (errors.title) setErrors((e) => ({ ...e, title: undefined }));
            }}
            error={errors.title}
            placeholder="Sum it up in a few words"
          />

          <div>
            <label htmlFor={bodyId} className="text-sm font-medium text-ink">
              Your review
            </label>
            <textarea
              id={bodyId}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (errors.body) setErrors((er) => ({ ...er, body: undefined }));
              }}
              rows={4}
              placeholder="What did you think of the fit, fabric and print?"
              aria-invalid={errors.body ? true : undefined}
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            />
            {errors.body ? (
              <p role="alert" className="mt-1 text-sm text-error">
                {errors.body}
              </p>
            ) : null}
          </div>

          <Field
            id={authorId}
            label="Your name"
            value={effectiveAuthor}
            onChange={(v) => {
              setAuthor(v);
              setTouchedAuthor(true);
              if (errors.author) setErrors((e) => ({ ...e, author: undefined }));
            }}
            error={errors.author}
            placeholder="How your name appears on the review"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={submitting}>
              Submit review
            </Button>
            <p className="text-xs text-muted">
              Preview — stored on this device only, not sent or moderated yet (TMS-FBR-008).
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className="mt-1 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      />
      {error ? (
        <p role="alert" className="mt-1 text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
