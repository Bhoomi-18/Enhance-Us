import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils';

export const LoadingSpinner = ({ size = 'md', className, label = 'Loading...' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-6 gap-3 text-slate-500 dark:text-slate-400', className)}>
      <Loader2 className={cn('animate-spin text-teal-600 dark:text-teal-400', sizes[size])} />
      {label && <span className="text-xs font-medium tracking-wide">{label}</span>}
    </div>
  );
};

export default LoadingSpinner;
