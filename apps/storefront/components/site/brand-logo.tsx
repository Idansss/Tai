import { cn } from '@tms/ui';
import Image from 'next/image';

export interface BrandLogoProps {
  alt?: string;
  className?: string;
  inverse?: boolean;
  priority?: boolean;
  sizes?: string;
}

/** The canonical F.A.T.U brand mark, cropped and optimized from the supplied artwork. */
export function BrandLogo({
  alt = '',
  className,
  inverse = false,
  priority = false,
  sizes = '48px',
}: BrandLogoProps) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden',
        inverse && 'rounded-md bg-[#fafaf7] p-2',
        className,
      )}
    >
      <Image
        src="/brand/fatu-logo.png"
        alt={alt}
        width={1024}
        height={1024}
        priority={priority}
        sizes={sizes}
        className="size-full object-contain"
      />
    </span>
  );
}
