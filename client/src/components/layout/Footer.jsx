import React from 'react';
import { Compass } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-200/80 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-slate-800">EnhanceUs</span>
            <span className="text-xs text-slate-400">| Goal-Driven Skill Exchange</span>
          </div>

          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} EnhanceUs. Built for ambitious goals and mutual skill growth.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
