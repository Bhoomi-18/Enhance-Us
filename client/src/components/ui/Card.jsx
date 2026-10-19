import React from 'react';
import { cn } from '../../utils';

export const Card = ({ children, className, hover = false, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-subtle dark:shadow-none transition-all duration-200 p-6',
        hover && 'hover:shadow-card hover:border-slate-300 dark:hover:border-slate-700',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className, ...props }) => (
  <div className={cn('mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className, ...props }) => (
  <h3 className={cn('text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className, ...props }) => (
  <p className={cn('text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className, ...props }) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className, ...props }) => (
  <div className={cn('mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

export default Card;
