import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

const ratioToken: Record<string, string> = {
  artwork: 'var(--ratio-artwork)',
  product: 'var(--ratio-product)',
  collection: 'var(--ratio-collection)',
  wide: 'var(--ratio-wide)',
  square: 'var(--ratio-square)',
};

const frameVariants = cva('relative overflow-hidden isolate', {
  variants: {
    mat: {
      /* Art sits on a white paper mat; product on canvas; none for full-bleed. */
      paper: 'bg-elevated',
      canvas: 'bg-canvas-2',
      none: '',
    },
    frame: {
      hairline: 'border border-line',
      none: '',
    },
    rounded: {
      true: 'rounded-[var(--radius-lg)]',
      false: '',
    },
    interactive: {
      /* Slow zoom on hover/focus-within of the media (img or svg plate) inside.
         Media should fill the frame (`h-full w-full object-cover`). */
      true: 'group [&_img]:transition-transform [&_img]:duration-[var(--duration-slower)] [&_img]:ease-[var(--ease-out)] hover:[&_img]:scale-[1.04] focus-within:[&_img]:scale-[1.04] motion-reduce:[&_img]:transition-none [&_svg]:transition-transform [&_svg]:duration-[var(--duration-slower)] [&_svg]:ease-[var(--ease-out)] hover:[&_svg]:scale-[1.04] focus-within:[&_svg]:scale-[1.04] motion-reduce:[&_svg]:transition-none',
      false: '',
    },
  },
  defaultVariants: { mat: 'paper', frame: 'hairline', rounded: true, interactive: false },
});

export interface FrameProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof frameVariants> {
  /** Aspect ratio from the image system. */
  ratio?: keyof typeof ratioToken;
}

/**
 * The image-treatment primitive (master prompt §12). Enforces a fixed aspect ratio (no CLS,
 * no stretch), an optional paper mat and hairline frame, and an optional slow hover zoom.
 * Framework-agnostic: pass a plain <img> or a framework <Image> as the child with
 * `className="h-full w-full object-cover"`.
 */
export const Frame = forwardRef<HTMLDivElement, FrameProps>(function Frame(
  { ratio = 'artwork', mat, frame, rounded, interactive, className, style, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(frameVariants({ mat, frame, rounded, interactive }), className)}
      style={{ aspectRatio: ratioToken[ratio], ...style }}
      {...props}
    >
      {children}
    </div>
  );
});
