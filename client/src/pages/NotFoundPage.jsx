import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';
import usePageMeta from '../hooks/usePageMeta';

export const NotFoundPage = () => {
  usePageMeta('Page Not Found | EnhanceUs');

  return (
    <PageContainer>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
          <img src="/favicon.png" alt="EnhanceUs Logo" className="w-16 h-16 rounded-2xl object-contain shadow-sm animate-bounce" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-2">404</h1>
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">Page Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
          The goal route or workspace page you are trying to access does not exist or has moved.
        </p>
        <Link to="/">
          <Button leftIcon={Home} size="md">
            Return to Home
          </Button>
        </Link>
      </div>
    </PageContainer>
  );
};

export default NotFoundPage;
