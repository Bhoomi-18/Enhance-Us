import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Mail, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { verifyEmail, resendVerification } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [status, setStatus] = useState(token ? 'verifying' : 'idle'); // 'verifying' | 'success' | 'error' | 'idle'
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState(user?.email || '');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const executeVerification = async () => {
      try {
        setStatus('verifying');
        const res = await verifyEmail(token);
        if (isMounted) {
          setStatus('success');
          setMessage(res.data?.message || 'Your email address has been verified successfully!');
          if (refreshUser) {
            await refreshUser().catch(() => {});
          }
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setMessage(
            err.response?.data?.message ||
              err.message ||
              'Invalid or expired verification link. Please request a new verification link below.'
          );
        }
      }
    };

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendLoading(true);
    setResendSuccess('');
    setResendError('');

    try {
      const res = await resendVerification(resendEmail);
      setResendSuccess(
        res.data?.message || 'A fresh verification link has been sent to your email address.'
      );
    } catch (err) {
      setResendError(
        err.response?.data?.message ||
          err.message ||
          'Failed to resend verification link. Please try again in a few moments.'
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border border-slate-200/80 dark:border-slate-800">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform">
              {status === 'verifying' && (
                <div className="bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 p-3 rounded-2xl">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
              {status === 'success' && (
                <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 p-3 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}
              {(status === 'error' || status === 'idle') && (
                <div className="bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 p-3 rounded-2xl">
                  <Mail className="w-6 h-6" />
                </div>
              )}
            </div>
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {status === 'verifying' && 'Verifying Email Address'}
              {status === 'success' && 'Account Verified!'}
              {status === 'error' && 'Verification Link Expired'}
              {status === 'idle' && 'Verify Your Email'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {status === 'verifying' && 'Validating your cryptographic verification link with EnhanceUs...'}
              {status === 'success' && 'Your email has been confirmed. You now have full access to learning blueprints, roadmaps, and peer exchanges.'}
              {status === 'error' && message}
              {status === 'idle' && 'Check your inbox for a verification email or request a new link below.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {status === 'success' && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs text-center font-medium">
                  {message}
                </div>
                <Button
                  className="w-full"
                  rightIcon={ArrowRight}
                  onClick={() => navigate(user ? '/dashboard' : '/login')}
                >
                  {user ? 'Go to Dashboard' : 'Continue to Login'}
                </Button>
              </div>
            )}

            {(status === 'error' || status === 'idle') && (
              <div className="space-y-5">
                {resendSuccess && (
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-xl text-teal-800 dark:text-teal-300 text-xs font-medium">
                    {resendSuccess}
                  </div>
                )}

                {resendError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium">
                    {resendError}
                  </div>
                )}

                <form onSubmit={handleResend} className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Registered Email Address
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    disabled={resendLoading}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    leftIcon={RefreshCw}
                    isLoading={resendLoading}
                  >
                    Resend Verification Link
                  </Button>
                </form>

                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 text-center">
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
