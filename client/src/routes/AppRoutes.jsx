import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';
import AdminRoute from './AdminRoute';

// Route-level code splitting for optimized bundle delivery and fast TTI
const HomePage = lazy(() => import('../pages/HomePage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const GoalsPage = lazy(() => import('../pages/GoalsPage'));
const GoalDetailPage = lazy(() => import('../pages/GoalDetailPage'));
const RoadmapsPage = lazy(() => import('../pages/RoadmapsPage'));
const RoadmapDetailPage = lazy(() => import('../pages/RoadmapDetailPage'));
const MatchesPage = lazy(() => import('../pages/MatchesPage'));
const MatchDetailPage = lazy(() => import('../pages/MatchDetailPage'));
const MessagesPage = lazy(() => import('../pages/MessagesPage'));
const SessionsPage = lazy(() => import('../pages/SessionsPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const SearchPage = lazy(() => import('../pages/SearchPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const VerifyEmailPage = lazy(() => import('../pages/VerifyEmailPage'));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));
const CirclesPage = lazy(() => import('../pages/CirclesPage'));
const CircleDetailPage = lazy(() => import('../pages/CircleDetailPage'));
const WorkspacesPage = lazy(() => import('../pages/WorkspacesPage'));
const WorkspaceDetailPage = lazy(() => import('../pages/WorkspaceDetailPage'));
const ChallengesPage = lazy(() => import('../pages/ChallengesPage'));
const ChallengeDetailPage = lazy(() => import('../pages/ChallengeDetailPage'));
const CoachPage = lazy(() => import('../pages/CoachPage'));
const CommunityInsightsPage = lazy(() => import('../pages/CommunityInsightsPage'));
const AdminPage = lazy(() => import('../pages/AdminPage'));

const PageLoadingFallback = () => (
  <div
    role="status"
    aria-live="polite"
    className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-3"
  >
    <div className="w-10 h-10 border-3 border-teal-500/20 border-t-teal-600 dark:border-teal-400/20 dark:border-t-teal-400 rounded-full animate-spin" />
    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
      Loading view...
    </span>
    <span className="sr-only">Content is loading, please wait</span>
  </div>
);

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* Public Landing Page */}
        <Route index element={<HomePage />} />

        {/* Public Email Verification & Password Reset Routes */}
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />

        {/* Public Guest Only Auth Routes */}
        <Route
          path="login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />

        {/* Protected Authenticated Routes */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile/:id"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="goals"
          element={
            <ProtectedRoute>
              <GoalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="goals/:id"
          element={
            <ProtectedRoute>
              <GoalDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="roadmaps"
          element={
            <ProtectedRoute>
              <RoadmapsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="roadmaps/:id"
          element={
            <ProtectedRoute>
              <RoadmapDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="matches"
          element={
            <ProtectedRoute>
              <MatchesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="matches/:id"
          element={
            <ProtectedRoute>
              <MatchDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sessions"
          element={
            <ProtectedRoute>
              <SessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="circles"
          element={
            <ProtectedRoute>
              <CirclesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="circles/:id"
          element={
            <ProtectedRoute>
              <CircleDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="workspaces"
          element={
            <ProtectedRoute>
              <WorkspacesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="workspaces/:id"
          element={
            <ProtectedRoute>
              <WorkspaceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="challenges"
          element={<ChallengesPage />}
        />
        <Route
          path="challenges/:id"
          element={<ChallengeDetailPage />}
        />
        <Route
          path="coach"
          element={
            <ProtectedRoute>
              <CoachPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="insights"
          element={
            <ProtectedRoute>
              <CommunityInsightsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Private Admin Portal */}
        <Route
          path="admin/*"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />

        {/* 404 Catch All */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
};

export default AppRoutes;
