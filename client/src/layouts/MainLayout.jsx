import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import OnboardingTourModal from '../components/common/OnboardingTourModal';
import ColdStartNotice from '../components/common/ColdStartNotice';
import UnverifiedEmailNotice from '../components/common/UnverifiedEmailNotice';
import { useAuth } from '../context/AuthContext';

export const MainLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && !user.onboardingCompletedAt) {
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
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
      <OnboardingTourModal isOpen={showTour} onClose={() => setShowTour(false)} />
    </div>
  );
};

export default MainLayout;
