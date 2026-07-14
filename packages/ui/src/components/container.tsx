import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

const containerVariants = cva('mx-auto w-full px-5 sm:px-6 lg:px-8', {
  variants: {
    width: {
      content: 'max-w-[72rem]',
      prose: 'max-w-[42rem]',
      wide: 'max-w-[90rem]',
      full: 'max-w-none',
    },
  },
  defaultVariants: { width: 'content' },
});

export interface ContainerProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof containerVariants> {}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(function Container(
  { className, width, ...props },
  ref,
) {
  return <div ref={ref} className={cn(containerVariants({ width }), className)} {...props} />;
});
