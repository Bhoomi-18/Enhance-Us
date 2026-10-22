import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  MessageSquare,
  Activity,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AdminOverviewTab from '../components/admin/AdminOverviewTab';
import AdminUsersTab from '../components/admin/AdminUsersTab';
import AdminAnalyticsTab from '../components/admin/AdminAnalyticsTab';
import AdminFeedbackTab from '../components/admin/AdminFeedbackTab';
import AdminHealthTab from '../components/admin/AdminHealthTab';
import AdminAuditLogsTab from '../components/admin/AdminAuditLogsTab';

export const AdminPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Directory', icon: Users },
    { id: 'analytics', label: 'Analytics & Funnels', icon: TrendingUp },
    { id: 'feedback', label: 'Feedback Inbox', icon: MessageSquare },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'audit', label: 'Audit Trail', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-lg shadow-teal-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                EnhanceUs Admin Portal
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorized Administrator: <strong className="text-slate-800 dark:text-slate-200 font-mono">{user?.email}</strong>
              </p>
            </div>
          </div>

          {/* Tab Navigation Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="animate-in fade-in duration-200">
          {activeTab === 'overview' && <AdminOverviewTab />}
          {activeTab === 'users' && <AdminUsersTab />}
          {activeTab === 'analytics' && <AdminAnalyticsTab />}
          {activeTab === 'feedback' && <AdminFeedbackTab />}
          {activeTab === 'health' && <AdminHealthTab />}
          {activeTab === 'audit' && <AdminAuditLogsTab />}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
