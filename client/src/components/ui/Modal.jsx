import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils';

export const Modal = ({ isOpen, onClose, title, description, children, className }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={cn(
          'w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-elevated border border-slate-200 dark:border-slate-800 p-6 relative animate-in zoom-in-95 duration-200',
          className
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>}
            {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
