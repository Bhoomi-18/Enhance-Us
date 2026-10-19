import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Sliders,
  Bell,
  Shield,
  Sun,
  Moon,
  Laptop,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  User,
  ShieldAlert,
  Info,
  Check,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, deleteAccount } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState(null);

  const isDeletePhraseValid = confirmationPhrase === 'DELETE';
  const isFormValid = isDeletePhraseValid && password.trim().length > 0;

  const handleOpenDeleteModal = () => {
    setPassword('');
    setConfirmationPhrase('');
    setDeletionError(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return; // Prevent closing mid-request
    setIsDeleteModalOpen(false);
    setPassword('');
    setConfirmationPhrase('');
    setDeletionError(null);
  };

  const handleDeleteConfirm = async (e) => {
    e.preventDefault();
    if (!isFormValid || isDeleting) return;

    setIsDeleting(true);
    setDeletionError(null);

    try {
      await deleteAccount({ password, confirmationPhrase });
      setIsDeleteModalOpen(false);
      navigate('/login', {
        state: {
          statusMessage: 'Your account and all associated personal data have been permanently deleted.',
        },
        replace: true,
      });
    } catch (err) {
      setDeletionError(err.message || 'An error occurred while deleting your account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const themeOptions = [
    {
      id: 'light',
      title: 'Light Mode',
      desc: 'Crisp, high-contrast light surfaces for bright working environments.',
      icon: Sun,
      iconColor: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60',
    },
    {
      id: 'dark',
      title: 'Dark Mode',
      desc: 'Sleek dark slate surfaces designed for low-light focus and reduced eye strain.',
      icon: Moon,
      iconColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
    },
    {
      id: 'system',
      title: 'System Default',
      desc: 'Automatically synchronizes with your device operating system theme settings.',
      icon: Laptop,
      iconColor: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60',
    },
  ];

  return (
    <PageContainer
      title="Platform Settings"
      subtitle="Manage your visual theme, account preferences, security settings, and data lifecycle."
    >
      <div className="space-y-8 max-w-4xl">

        {/* 1. APPEARANCE & THEME PREFERENCES */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base">Appearance & Theme Preferences</CardTitle>
            </div>
            <CardDescription>
              Customize how EnhanceUs looks on this device. Your preference persists automatically across sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    aria-pressed={isSelected}
                    className={`flex flex-col text-left p-4 rounded-2xl border-2 transition-all duration-200 relative ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/40 dark:bg-teal-950/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 w-full">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${opt.iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">
                      {opt.title}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Active Render Mode: <strong className="text-slate-800 dark:text-slate-200 capitalize">{resolvedTheme}</strong></span>
              <span className="text-[11px]">Stored in browser localStorage</span>
            </div>
          </CardContent>
        </Card>

        {/* 2. USER ACCOUNT SUMMARY */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" />
              <CardTitle className="text-base">Account Identity & Status</CardTitle>
            </div>
            <CardDescription>Your registered profile details and security status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">Display Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{user?.name || 'User'}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">Email Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{user?.email || 'N/A'}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">Account Role</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm capitalize">{user?.role || 'Member'}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">Account Mode</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {user?.isDemo ? (
                    <Badge variant="amber">Demo Protected Account</Badge>
                  ) : (
                    <Badge variant="emerald">Standard Production Account</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. PLATFORM PREFERENCES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-base">Exchange & Match Settings</CardTitle>
              </div>
              <CardDescription>Configure how EnhanceUs pairs your goals with potential exchange partners.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reciprocal compatibility weighting and skill proficiency filters operate automatically. Custom threshold tuning will be available in the next release.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-base">Notifications & Activity Alerts</CardTitle>
              </div>
              <CardDescription>Manage updates for goal milestones and match proposals.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                In-app notifications are active. Email digests and milestone reminders can be configured here once SMTP integration is connected.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 4. DANGER ZONE — PERMANENT ACCOUNT DELETION */}
        <Card className="border-rose-300 dark:border-rose-900/60 bg-gradient-to-b from-white to-rose-50/20 dark:from-slate-900 dark:to-rose-950/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <CardTitle className="text-base text-rose-700 dark:text-rose-400">Danger Zone — Permanent Account Deletion</CardTitle>
            </div>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Permanently delete your account and all associated personal data from EnhanceUs.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300 text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>This action is immediate, permanent, and cannot be undone.</span>
              </div>
              <p className="leading-relaxed">
                When you delete your account, EnhanceUs executes real cascading deletion and data anonymization across the entire platform:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 ml-1">
                <li><strong>Permanently Deleted:</strong> Your user profile, declared skills, learning goals, AI-generated roadmaps, notifications, pending exchange requests, and match records.</li>
                <li><strong>Shared Content Anonymization:</strong> Active connections with peers are terminated. Completed exchange sessions, reviews, and past messages retain historical integrity for peers without displaying your personal identity.</li>
                <li><strong>Authentication Invalidation:</strong> Your active session tokens and HTTP-only cookies are immediately invalidated. The deleted account can never be restored.</li>
                <li><strong>Backups Notice:</strong> Database records are purged synchronously. Routine backup snapshots are cycled and expired according to standard operational retention schedules.</li>
              </ul>
            </div>

            {user?.isDemo && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Demo accounts are protected from deletion to ensure platform review reliability.</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-rose-100 dark:border-rose-950/60">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Requires confirmation phrase and password verification.
            </span>
            <Button
              variant="danger"
              size="sm"
              leftIcon={Trash2}
              onClick={handleOpenDeleteModal}
              disabled={user?.isDemo}
              title={user?.isDemo ? 'Demo accounts cannot be deleted' : 'Permanently delete account'}
            >
              Delete Account Permanently
            </Button>
          </CardFooter>
        </Card>

      </div>

      {/* CONFIRMATION & RE-AUTHENTICATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Account Permanently"
        description="This action cannot be undone. Please review the consequences and confirm your identity."
        className="max-w-lg border-rose-200 dark:border-rose-900"
      >
        <form onSubmit={handleDeleteConfirm} className="space-y-4 pt-2">
          
          {deletionError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{deletionError}</div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Account to be deleted: <span className="text-teal-600 dark:text-teal-400">{user?.email}</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              All your goals, roadmaps, and profile data will be permanently wiped. You will be logged out immediately.
            </p>
          </div>

          {/* Re-authentication: Current Password */}
          <div>
            <Input
              id="confirm-deletion-password"
              label="Re-enter Your Password"
              type="password"
              placeholder="Enter your current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isDeleting}
              icon={Lock}
              required
              helperText="Required to verify account ownership before deletion."
            />
          </div>

          {/* Explicit Confirmation Phrase: DELETE */}
          <div>
            <Input
              id="confirm-deletion-phrase"
              label="Type DELETE to Confirm"
              type="text"
              placeholder="DELETE"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              disabled={isDeleting}
              required
              helperText="Type the word DELETE in uppercase letters."
              className={confirmationPhrase && !isDeletePhraseValid ? 'border-rose-400' : ''}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCloseDeleteModal}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              disabled={!isFormValid || isDeleting}
              leftIcon={Trash2}
            >
              Permanently Delete Account
            </Button>
          </div>
        </form>
      </Modal>

    </PageContainer>
  );
};

export default SettingsPage;
