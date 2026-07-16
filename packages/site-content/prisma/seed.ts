/* eslint-disable no-console -- this is a CLI seed script; progress output is intended */
import { hashPassword } from '../src/auth.js';
import { createSiteContentClient } from '../src/client.js';
import { SETTING_KEYS } from '../src/settings.js';

/**
 * Idempotent CMS seed: an owner admin, business details, maintenance/flags
 * defaults, and a starter published announcement so the storefront bar renders
 * real data immediately. Safe to run repeatedly — nothing is duplicated and an
 * existing owner's password is never reset.
 */
async function main(): Promise<void> {
  const client = createSiteContentClient();
  try {
    const ownerEmail = (process.env.CMS_SEED_OWNER_EMAIL ?? 'owner@taimanic.local').toLowerCase();
    const ownerPassword = process.env.CMS_SEED_OWNER_PASSWORD ?? 'ChangeMe!Owner1';

    const owner = await client.adminUser.upsert({
      where: { email: ownerEmail },
      create: {
        email: ownerEmail,
        name: 'Studio Owner',
        role: 'OWNER',
        status: 'ACTIVE',
        passwordHash: hashPassword(ownerPassword),
      },
      update: { role: 'OWNER', status: 'ACTIVE' },
    });
    console.log(`✔ owner admin ready: ${owner.email}`);

    await client.siteSetting.upsert({
      where: { key: SETTING_KEYS.business },
      create: {
        key: SETTING_KEYS.business,
        description: 'Public business contact details.',
        value: {
          email: 'hello@taimanicstudios.com',
          phone: '+234 000 000 0000',
          addressLines: ['Tai Manic Studios'],
          hours: 'Mon–Fri, 9am–6pm WAT',
          city: 'Lagos',
          country: 'Nigeria',
        },
      },
      update: {},
    });

    await client.siteSetting.upsert({
      where: { key: SETTING_KEYS.maintenance },
      create: {
        key: SETTING_KEYS.maintenance,
        description: 'Site-wide maintenance mode.',
        value: {
          enabled: false,
          message: 'We are performing scheduled maintenance. Please check back shortly.',
        },
      },
      update: {},
    });

    await client.siteSetting.upsert({
      where: { key: SETTING_KEYS.featureFlags },
      create: {
        key: SETTING_KEYS.featureFlags,
        description: 'Storefront feature toggles.',
        value: { announcementBar: true, studioGuide: true, communityGallery: true },
      },
      update: {},
    });

    const announcementCount = await client.announcement.count();
    if (announcementCount === 0) {
      await client.announcement.create({
        data: {
          message: 'From Africa, to You — free UK & EU delivery on orders over £120.',
          href: '/shop',
          linkLabel: 'Shop the collection',
          tone: 'DEFAULT',
          status: 'PUBLISHED',
          publishedAt: new Date(),
          sortOrder: 0,
          createdById: owner.id,
          updatedById: owner.id,
        },
      });
      console.log('✔ starter announcement created');
    } else {
      console.log(`• ${announcementCount} announcement(s) already present, skipping starter`);
    }

    console.log('CMS seed complete.');
  } finally {
    await client.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
