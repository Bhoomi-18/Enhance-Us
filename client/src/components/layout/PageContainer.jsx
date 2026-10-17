import React from 'react';
import { cn } from '../../utils';

export const PageContainer = ({ children, title, subtitle, action, className }) => {
  return (
    <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full', className)}>
      {(title || subtitle || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            {title && <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>}
            {subtitle && <p className="text-xs text-slate-500 mt-1 max-w-2xl">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default PageContainer;
