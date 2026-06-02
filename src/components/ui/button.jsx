import * as React from 'react';
import { cn } from '../../lib/utils.js';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50';

const variants = {
  default:
    'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]',
  ghost: 'text-slate-300 hover:bg-white/10',
  outline: 'border border-white/15 bg-white/5 text-white hover:bg-white/10'
};

const sizes = {
  default: 'h-11 px-6 py-2',
  sm: 'h-9 px-4 text-xs',
  lg: 'h-12 px-8 text-base'
};

const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant] || variants.default, sizes[size] || sizes.default, className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { Button };
