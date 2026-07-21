/** Artwork and clothing imagery supplied by the studio on 2026-07-21. */

export interface SuppliedArtworkSeed {
  slug: string;
  collection: 'Africa United' | 'Resilience' | 'Studio Muses';
}

export const suppliedArtworkSeeds: SuppliedArtworkSeed[] = [
  { slug: 'resilience-muse-curls', collection: 'Resilience' },
  { slug: 'resilience-muse-green-cap', collection: 'Resilience' },
  { slug: 'resilience-muse-white-crop', collection: 'Resilience' },
  { slug: 'resilience-seated-queen', collection: 'Resilience' },
  { slug: 'resilience-market-pose', collection: 'Resilience' },
  { slug: 'africa-united-heritage-trio', collection: 'Africa United' },
  { slug: 'africa-united-heritage-duo', collection: 'Africa United' },
  { slug: 'resilience-hands-high', collection: 'Resilience' },
  { slug: 'resilience-after-dark', collection: 'Resilience' },
  { slug: 'resilience-studio-seat', collection: 'Resilience' },
  { slug: 'resilience-night-white', collection: 'Resilience' },
  { slug: 'resilience-profile', collection: 'Resilience' },
  { slug: 'resilience-night-market', collection: 'Resilience' },
  { slug: 'africa-united-night-trio', collection: 'Africa United' },
  { slug: 'resilience-heritage-night', collection: 'Resilience' },
  { slug: 'resilience-garden-night', collection: 'Resilience' },
  { slug: 'africa-united-night-duo', collection: 'Africa United' },
  { slug: 'artisan-circle', collection: 'Africa United' },
  { slug: 'market-cap-muse', collection: 'Studio Muses' },
  { slug: 'atelier-circle', collection: 'Africa United' },
  { slug: 'studio-cap-muse', collection: 'Studio Muses' },
  { slug: 'heritage-room-muse', collection: 'Studio Muses' },
  { slug: 'white-crop-muse', collection: 'Studio Muses' },
  { slug: 'red-cap-pose', collection: 'Studio Muses' },
  { slug: 'sunset-market-muse', collection: 'Studio Muses' },
  { slug: 'garden-seated-muse', collection: 'Studio Muses' },
  { slug: 'patterned-top-muse', collection: 'Studio Muses' },
  { slug: 'market-vendor-muse', collection: 'Studio Muses' },
  { slug: 'heritage-family', collection: 'Africa United' },
  { slug: 'city-sisters', collection: 'Africa United' },
  { slug: 'night-market-muse', collection: 'Studio Muses' },
  { slug: 'striped-crop-muse', collection: 'Studio Muses' },
  { slug: 'studio-stool-muse', collection: 'Studio Muses' },
  { slug: 'green-top-profile', collection: 'Studio Muses' },
];

export interface SuppliedShopDesign {
  slug: string;
  artworkSlug: string;
  title: string;
  garment: string;
  image: string;
}

export const suppliedShopDesigns: SuppliedShopDesign[] = [
  {
    slug: 'africa-united-white-tee',
    artworkSlug: 'africa-united-heritage-trio',
    title: 'Africa United — White Tee',
    garment: 'White T-shirt',
    image: '/products/africa-united-white-tee.jpg',
  },
  {
    slug: 'africa-united-black-tee',
    artworkSlug: 'africa-united-heritage-duo',
    title: 'Africa United — Black Tee',
    garment: 'Black T-shirt',
    image: '/products/africa-united-black-tee.jpg',
  },
  {
    slug: 'resilience-white-tee',
    artworkSlug: 'resilience-hands-high',
    title: 'Resilience — White Tee',
    garment: 'White T-shirt',
    image: '/products/resilience-white-tee.jpg',
  },
  {
    slug: 'africa-united-model-tee',
    artworkSlug: 'africa-united-night-trio',
    title: 'Africa United — Worn',
    garment: 'Black T-shirt',
    image: '/products/africa-united-model-tee.jpg',
  },
];
