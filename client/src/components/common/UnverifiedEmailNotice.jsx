import React, { useState } from 'react';
import { Mail, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resendVerification } from '../../services/authService';

export const UnverifiedEmailNotice = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Only display for authenticated real users whose email is strictly unverified
  if (!user || user.isDemo || user.emailVerified !== false) {
    return null;
  }

  const handleResend = async () => {
    setLoading(true);
    setSentMessage('');
    setErrorMessage('');
    try {
      const res = await resendVerification(user.email);
      setSentMessage(res.data?.message || 'Verification link sent! Check your inbox.');
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to resend. Please try again shortly.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Action required:</strong> Please verify your email address (<strong>{user.email}</strong>) to unlock goal creation, roadmaps, and exchange sessions.
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {sentMessage && (
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {sentMessage}
            </span>
          )}

          {errorMessage && (
            <span className="text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorMessage}
            </span>
          )}

          {!sentMessage && (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors disabled:opacity-60 shadow-sm"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Sending...' : 'Resend Verification'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnverifiedEmailNotice;
