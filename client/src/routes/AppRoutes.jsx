import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import ProfilePage from '../pages/ProfilePage';
import GoalsPage from '../pages/GoalsPage';
import GoalDetailPage from '../pages/GoalDetailPage';
import RoadmapsPage from '../pages/RoadmapsPage';
import RoadmapDetailPage from '../pages/RoadmapDetailPage';
import MatchesPage from '../pages/MatchesPage';
import MatchDetailPage from '../pages/MatchDetailPage';
import MessagesPage from '../pages/MessagesPage';
import SessionsPage from '../pages/SessionsPage';
import NotificationsPage from '../pages/NotificationsPage';
import SearchPage from '../pages/SearchPage';
import SettingsPage from '../pages/SettingsPage';
import NotFoundPage from '../pages/NotFoundPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import CirclesPage from '../pages/CirclesPage';
import CircleDetailPage from '../pages/CircleDetailPage';
import WorkspacesPage from '../pages/WorkspacesPage';
import WorkspaceDetailPage from '../pages/WorkspaceDetailPage';
import CoachPage from '../pages/CoachPage';
import CommunityInsightsPage from '../pages/CommunityInsightsPage';
import AdminPage from '../pages/AdminPage';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';
import AdminRoute from './AdminRoute';

export const AppRoutes = () => {
  return (
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
  );
};

export default AppRoutes;
