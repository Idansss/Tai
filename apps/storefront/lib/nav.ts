export interface NavItem {
  href: string;
  label: string;
}

/** Primary navigation shown in the header and mobile menu. */
export const primaryNav: NavItem[] = [
  { href: '/artworks', label: 'Artworks' },
  { href: '/collections', label: 'Collections' },
  { href: '/drops', label: 'Drops' },
  { href: '/shop', label: 'Shop' },
  { href: '/design-studio', label: 'Design Studio' },
  { href: '/stories', label: 'Stories' },
  { href: '/about', label: 'About' },
];

/** Footer link groups. */
export const footerNav: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Explore',
    items: [
      { href: '/artworks', label: 'Artworks' },
      { href: '/collections', label: 'Collections' },
      { href: '/drops', label: 'Drops' },
      { href: '/shop', label: 'Shop' },
      { href: '/design-studio', label: 'Design Studio' },
      { href: '/community', label: 'Community' },
    ],
  },
  {
    heading: 'Studio',
    items: [
      { href: '/about', label: 'About' },
      { href: '/artist', label: 'The artist' },
      { href: '/stories', label: 'Stories' },
    ],
  },
  {
    heading: 'Help',
    items: [
      { href: '/delivery', label: 'Delivery' },
      { href: '/returns', label: 'Returns' },
      { href: '/size-guide', label: 'Size guide' },
      { href: '/faq', label: 'FAQ' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Legal',
    items: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/cookies', label: 'Cookies' },
    ],
  },
];
