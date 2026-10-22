import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Link, Outlet } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, RefreshCw, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkAdminStatus } from '../services/adminService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';

export const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();

  const [isAdmin, setIsAdmin] = useState(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const verifyAdminPrivileges = async () => {
    setCheckingAdmin(true);
    setErrorMessage('');
    try {
      const res = await checkAdminStatus();
      if (res?.data?.isAdmin) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        setErrorMessage('Your account is not authorized for administrative access.');
      }
    } catch (err) {
      setIsAdmin(false);
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          'Access denied. Only verified administrators defined in ADMIN_EMAILS can access this portal.'
      );
    } finally {
      setCheckingAdmin(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      verifyAdminPrivileges();
    } else if (!authLoading && !isAuthenticated) {
      setCheckingAdmin(false);
      setIsAdmin(false);
    }
  }, [isAuthenticated, user, authLoading]);

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center">
        <LoadingSpinner size="lg" label="Verifying Administrator Authorization..." />
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 max-w-sm animate-pulse">
          Validating server-side cryptographic credentials and administrator allowlist...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Access Restricted
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {errorMessage ||
                'This administrative console is restricted to authorized EnhanceUs administrators defined in server settings.'}
            </p>
            <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              Current account: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.email}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" />
                Return to Dashboard
              </Button>
            </Link>
            <Button
              variant="default"
              size="sm"
              onClick={verifyAdminPrivileges}
              className="w-full sm:w-auto gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Check
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
};

export default AdminRoute;
