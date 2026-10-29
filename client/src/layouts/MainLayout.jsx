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
    const isDismissedLocal = typeof window !== 'undefined' && localStorage.getItem('enhanceus_tour_dismissed') === 'true';
    const isExistingActiveUser = Boolean(
      (user?.skills && user.skills.length > 0) ||
      (user?.learningInterests && user.learningInterests.length > 0) ||
      (user?.sessionsCompleted && user.sessionsCompleted > 0)
    );

    if (
      isAuthenticated &&
      user &&
      !user.isDemo &&
      !user.onboardingCompletedAt &&
      !user.dismissedOnboardingAt &&
      !isDismissedLocal &&
      !isExistingActiveUser
    ) {
      setShowTour(true);
    } else {
      setShowTour(false);
    }
  }, [isAuthenticated, user]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* WCAG 2.2 Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal-600 focus:text-white focus:rounded-xl focus:shadow-elevated focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 font-bold text-xs"
      >
        Skip to main content
      </a>
      <ColdStartNotice />
      <UnverifiedEmailNotice />
      <Navbar />
      <main id="main-content" role="main" tabIndex="-1" className="flex-1 flex flex-col w-full min-w-0 focus:outline-none">
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
