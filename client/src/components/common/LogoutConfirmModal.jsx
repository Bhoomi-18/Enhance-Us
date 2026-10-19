import React from 'react';
import { LogOut, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export const LogoutConfirmModal = ({ isOpen, onClose, onConfirm, isLoading = false }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      title="Confirm Log Out"
      description="Please confirm you want to end your current session."
      className="max-w-md"
    >
      <div className="space-y-4 pt-1">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
              Are you sure you want to log out?
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Your active session tokens will be invalidated and cleared. You can sign back in at any time to resume your goals and exchanges.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            leftIcon={LogOut}
            className="px-4"
          >
            Confirm Logout
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LogoutConfirmModal;
