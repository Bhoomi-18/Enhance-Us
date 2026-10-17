import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';

export const NotFoundPage = () => {
  return (
    <PageContainer>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
          <Compass className="w-8 h-8 animate-bounce" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">404</h1>
        <h2 className="text-lg font-bold text-slate-700 mb-2">Page Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
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
