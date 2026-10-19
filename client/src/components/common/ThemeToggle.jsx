import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils';

export const ThemeToggle = ({ showDropdown = false, className }) => {
  const { theme, resolvedTheme, setTheme, toggleTheme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  if (!showDropdown) {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode (currently ${theme} mode)`}
        title={`Current: ${theme} mode. Click to toggle.`}
        className={cn(
          'p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40',
          className
        )}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 animate-in -spin-in-90 duration-200" />
        )}
      </button>
    );
  }

  const options = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Laptop },
  ];

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Theme selector"
        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
      >
        {isDark ? (
          <Moon className="w-4 h-4 text-indigo-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Select color theme"
          className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-900 rounded-xl shadow-elevated border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setTheme(opt.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  isSelected
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
