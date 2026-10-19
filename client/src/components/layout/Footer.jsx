import React, { useState } from 'react';
import { Compass, MessageSquarePlus } from 'lucide-react';
import FeedbackModal from '../common/FeedbackModal';

export const Footer = () => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

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

            <button
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 border border-teal-200 dark:border-teal-800/80 transition-colors shadow-subtle focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-label="Open platform feedback modal"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Feedback</span>
            </button>
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
