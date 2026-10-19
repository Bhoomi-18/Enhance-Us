import React from 'react';
import { Target } from 'lucide-react';
import { cn } from '../../utils';
import Button from './Button';

export const EmptyState = ({
  icon: Icon = Target,
  title = 'No items found',
  description = 'There are currently no items to display in this view.',
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-10 text-center bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800', className)}>
      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 shadow-sm border border-teal-100 dark:border-teal-900/40">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
