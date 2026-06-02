import * as React from 'react';
import { cn } from '../../lib/utils.js';

/** Native select styled like the auth UI (no Radix). */
const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-11 w-full appearance-none rounded-xl border border-white/10 bg-slate-800/80 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

export { Select };
