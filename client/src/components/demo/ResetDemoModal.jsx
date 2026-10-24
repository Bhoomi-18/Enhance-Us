import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import Button from '../ui/Button';
import * as demoService from '../../services/demoService';

const ResetDemoModal = ({ isOpen, onClose, onResetSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleReset = async () => {
    try {
      setLoading(true);
      setError(null);
      await demoService.resetDemoWorkspace();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onResetSuccess) {
          onResetSuccess();
        } else {
          window.location.reload();
        }
      }, 1000);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reset demo workspace');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Workspace Reset Successful!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Restoring your canonical baseline...
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 id="reset-modal-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Reset Demo Workspace
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Restore sample data to default baseline
                </p>
              </div>
            </div>

            <div className="p-3.5 mb-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p>
                  This will reset <strong>only your isolated sandbox</strong> back to the initial sample state (goals, roadmaps, circles, and sessions). Other demo visitors and real users will not be affected.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                onClick={handleReset}
                disabled={loading}
              >
                {loading ? 'Restoring...' : 'Confirm Reset'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetDemoModal;
