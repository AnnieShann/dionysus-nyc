import * as React from 'react';
import { cn } from '../../lib/utils';

// Status badge. Pass a color via `style={{ '--badge': color }}` and use tone="status",
// or use the neutral default.
export function Badge({
  className,
  color,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold leading-none',
        className
      )}
      style={
        color
          ? {
              color,
              background: `color-mix(in srgb, ${color} 18%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 45%, transparent)`,
            }
          : undefined
      }
      {...props}
    />
  );
}
