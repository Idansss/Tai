'use client';

import { Badge, Button, Heading, Text } from '@tms/ui';
import { Award, Check, Copy, Gift, Share2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dataProvider, type LoyaltyProfile, type LoyaltyReward } from '@/lib/data';
import {
  canRedeem,
  nextTier,
  pointsToNextTier,
  referralUrl,
  tierForPoints,
  tierProgressPercent,
} from '@/lib/loyalty';
import { AccountShell } from './account-shell';
import { useRequireAuth } from './use-require-auth';

const HOW_IT_WORKS = [
  'Earn 1 point for every ₦100 you spend.',
  'Get bonus points for reviews and referrals.',
  'Redeem points for rewards, and climb tiers as you go.',
];

export function LoyaltyView() {
  const { user, ready } = useRequireAuth('/account/loyalty');
  const [profile, setProfile] = useState<LoyaltyProfile | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    dataProvider.getLoyalty(user.email).then((data) => {
      if (active) setProfile(data);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const loading = !ready || !user || !profile;

  return (
    <AccountShell
      title="Loyalty & referrals"
      description="Earn points as you shop, unlock rewards, and share the studio with friends."
      loading={loading}
    >
      {profile ? <LoyaltyContent profile={profile} origin={origin} /> : null}
    </AccountShell>
  );
}

function LoyaltyContent({ profile, origin }: { profile: LoyaltyProfile; origin: string }) {
  const tier = tierForPoints(profile.lifetimePoints);
  const next = nextTier(profile.lifetimePoints);
  const toNext = pointsToNextTier(profile.lifetimePoints);
  const progress = tierProgressPercent(profile.lifetimePoints);

  return (
    <div className="space-y-8">
      <p className="rounded-[var(--radius-md)] border border-line bg-canvas-2 p-3 text-xs text-muted">
        Preview, points, tiers and rewards shown here are illustrative. Earning, redeeming and
        referral tracking arrive with the loyalty backend (TMS-FBR-008).
      </p>

      {/* Tier + balance */}
      <section
        aria-labelledby="tier-title"
        className="rounded-[var(--radius-lg)] border border-line bg-surface p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading id="tier-title" as={2} size="md">
              Your points
            </Heading>
            <p className="mt-2 font-display text-4xl text-ink">
              {profile.points.toLocaleString()}
              <span className="ml-2 align-middle text-sm font-normal text-muted">
                points to spend
              </span>
            </p>
            <p className="mt-1 text-sm text-muted">
              {profile.lifetimePoints.toLocaleString()} earned since{' '}
              {new Date(profile.memberSince).toLocaleDateString('en-GB', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <Badge tone="accent" icon={<Award className="size-3.5" aria-hidden />}>
            {tier.label} member
          </Badge>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{tier.label}</span>
            <span className="text-muted">{next ? next.label : 'Top tier'}</span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas-2"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress to ${next ? next.label : 'top tier'}`}
          >
            <div className="h-full rounded-full bg-accent-2" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-ink-2">
            {toNext !== null && next
              ? `${toNext.toLocaleString()} points to ${next.label}.`
              : "You're at the top tier, thank you."}
          </p>
        </div>
      </section>

      {/* Rewards */}
      <section aria-labelledby="rewards-title">
        <Heading id="rewards-title" as={2} size="md">
          Rewards
        </Heading>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {profile.rewards.map((reward) => (
            <li key={reward.id}>
              <RewardCard reward={reward} points={profile.points} />
            </li>
          ))}
        </ul>
      </section>

      {/* Referral */}
      <ReferralCard profile={profile} origin={origin} />

      {/* How it works */}
      <section
        aria-labelledby="how-title"
        className="rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-6"
      >
        <Heading id="how-title" as={2} size="md">
          How it works
        </Heading>
        <ol className="mt-4 space-y-3">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-ink-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-ink">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function RewardCard({ reward, points }: { reward: LoyaltyReward; points: number }) {
  const [redeemed, setRedeemed] = useState(false);
  const affordable = canRedeem(reward, points);

  return (
    <div className="flex h-full flex-col rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <Gift className="size-5 shrink-0 text-accent-2" aria-hidden />
        <Badge tone={affordable ? 'success' : 'neutral'}>
          {reward.pointsCost.toLocaleString()} pts
        </Badge>
      </div>
      <p className="mt-3 font-medium text-ink">{reward.name}</p>
      <p className="mt-1 flex-1 text-sm text-muted">{reward.description}</p>
      {redeemed ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-success">
          <Check className="size-4" aria-hidden /> Saved, redeem at checkout once live
        </p>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3 self-start"
          disabled={!affordable}
          onClick={() => setRedeemed(true)}
        >
          {affordable ? 'Redeem' : 'Not enough points'}
        </Button>
      )}
    </div>
  );
}

function ReferralCard({ profile, origin }: { profile: LoyaltyProfile; origin: string }) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const url = origin ? referralUrl(profile.referralCode, origin) : '';

  async function share() {
    if (!url) return;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Tai Manic Studios', url });
        return;
      } catch {
        // fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setNote('Referral link copied to your clipboard.');
    } catch {
      setNote('Copy your referral link from the field above to share it.');
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(profile.referralCode);
      setCopied(true);
      setNote('Referral code copied.');
    } catch {
      setNote('Copy your code from the field above.');
    }
  }

  return (
    <section
      aria-labelledby="referral-title"
      className="rounded-[var(--radius-lg)] border border-line bg-surface p-6"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-accent-2" aria-hidden />
        <Heading id="referral-title" as={2} size="md">
          Refer a friend
        </Heading>
      </div>
      <Text tone="secondary" className="mt-2 text-sm">
        {profile.referralRewardText}
      </Text>

      <div className="mt-4 space-y-3">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Your code
          </span>
          <div className="mt-1 flex gap-2">
            <input
              readOnly
              value={profile.referralCode}
              aria-label="Your referral code"
              className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-canvas-2 px-3 py-2 font-mono text-sm text-ink"
            />
            <Button type="button" variant="secondary" size="sm" onClick={copyCode}>
              <Copy className="size-4" aria-hidden /> Copy
            </Button>
          </div>
        </div>

        <div>
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Your link
          </span>
          <div className="mt-1 flex gap-2">
            <input
              readOnly
              value={url}
              aria-label="Your referral link"
              className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-canvas-2 px-3 py-2 text-sm text-ink"
            />
            <Button type="button" size="sm" onClick={share}>
              {copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Share2 className="size-4" aria-hidden />
              )}
              {copied ? 'Shared' : 'Share'}
            </Button>
          </div>
        </div>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-[1.25rem] text-xs text-muted">
        {note}
      </p>
      <p className="mt-1 text-xs text-muted">
        Preview, the link is shareable, but referrals aren’t tracked and no reward is granted yet
        (TMS-FBR-008).
      </p>
    </section>
  );
}
