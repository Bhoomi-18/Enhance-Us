import React, { useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils';

export const NavDropdown = ({
  id,
  label,
  icon: Icon,
  isActive = false,
  isOpen = false,
  onToggle,
  onClose,
  items = [],
  align = 'left',
}) => {
  const dropdownRef = useRef(null);

  // Close when clicking outside this dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        id={`nav-dropdown-${id}`}
        onClick={onToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={`nav-menu-${id}`}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500/40',
          isActive
            ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold shadow-xs'
            : isOpen
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
        )}
      >
        {Icon && <Icon className={cn('w-4 h-4', isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400')} />}
        <span>{label}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200',
            isOpen && 'rotate-180 text-teal-600 dark:text-teal-400'
          )}
        />
      </button>

      {/* Accessible Dropdown Panel */}
      {isOpen && (
        <div
          id={`nav-menu-${id}`}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={`nav-dropdown-${id}`}
          className={cn(
            'absolute top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                role="menuitem"
                className={({ isActive: isChildActive }) =>
                  cn(
                    'flex items-start gap-3 p-2.5 rounded-xl text-xs transition-colors',
                    isChildActive
                      ? 'bg-teal-50/80 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400'
                  )
                }
              >
                {ItemIcon && (
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-slate-600 dark:text-slate-300">
                    <ItemIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-400 font-normal leading-tight mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NavDropdown;
