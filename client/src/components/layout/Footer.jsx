import React, { useState, useRef, useEffect } from 'react';
import { Compass, MessageSquarePlus, ExternalLink } from 'lucide-react';
import FeedbackModal from '../common/FeedbackModal';
import { GOOGLE_FEEDBACK_FORM_URL } from '../../services/feedbackService';

export const Footer = () => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 mt-auto py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">EnhanceUs</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">| Goal-Driven Skill Exchange</span>
          </div>

          <div className="flex items-center gap-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} EnhanceUs. Built for ambitious goals and mutual skill growth.
            </p>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 border border-teal-200 dark:border-teal-800/80 transition-colors shadow-subtle focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="Open platform feedback options"
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Feedback</span>
              </button>

              {/* Feedback Options Dropdown Menu */}
              {isMenuOpen && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  className="absolute right-0 bottom-full mb-2 w-72 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60 mb-1">
                    Select Feedback Channel
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsFeedbackOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-800 dark:hover:text-teal-300 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-100/80 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <MessageSquarePlus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Give feedback on EnhanceUs
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Quick in-app feedback form
                      </div>
                    </div>
                  </button>

                  <a
                    href={GOOGLE_FEEDBACK_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-800 dark:hover:text-teal-300 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>Open Google Feedback Form</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        External Google Form (new tab)
                      </div>
                    </div>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </footer>
  );
};

export default Footer;
