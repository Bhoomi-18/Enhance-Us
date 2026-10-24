import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import OnboardingTourModal from '../components/common/OnboardingTourModal';
import ColdStartNotice from '../components/common/ColdStartNotice';
import UnverifiedEmailNotice from '../components/common/UnverifiedEmailNotice';
import DemoOnboardingTour from '../components/demo/DemoOnboardingTour';
import ResetDemoModal from '../components/demo/ResetDemoModal';
import { useAuth } from '../context/AuthContext';

export const MainLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const [showTour, setShowTour] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && !user.isDemo && !user.onboardingCompletedAt) {
      setShowTour(true);
    } else {
      setShowTour(false);
    }
  }, [isAuthenticated, user]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <ColdStartNotice />
      <UnverifiedEmailNotice />
      <Navbar />
      <main className="flex-1 flex flex-col w-full min-w-0">
        {user?.isDemo && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <DemoOnboardingTour onOpenResetModal={() => setIsResetModalOpen(true)} />
          </div>
        )}
        <Outlet />
      </main>
      <Footer />
      <OnboardingTourModal isOpen={showTour} onClose={() => setShowTour(false)} />
      <ResetDemoModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} />
    </div>
  );
};

export default MainLayout;
