import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, Info } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { forgotPassword } from '../services/authService';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from?.pathname || '/dashboard';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please enter both email address and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login({ email: formData.email, password: formData.password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email address or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-md mx-auto py-8">
        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <LogIn className="w-6 h-6" />
            </div>
            <CardTitle>Welcome Back to EnhanceUs</CardTitle>
            <CardDescription>Log in to access your active goals and peer matches</CardDescription>
          </CardHeader>
          <CardContent>
            {location.state?.statusMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                <p className="font-semibold">{location.state.statusMessage}</p>
              </div>
            )}

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                icon={Mail}
                required
              />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  icon={Lock}
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs my-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={formData.remember}
                    onChange={handleChange}
                    className="rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Remember session on this device</span>
                </label>
              </div>

              <Button type="submit" isLoading={loading} className="mt-2 w-full">
                Log In
              </Button>
            </form>

            {/* Explore Demo Account Section */}
            <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/40 border border-teal-200/80 dark:border-teal-800/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wider">
                    Explore Demo Account
                  </span>
                  <span className="text-[10px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded-full">
                    Instant Access
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                  Want to test EnhanceUs without registering? Explore our pre-configured goal blueprint and reciprocal matching demo account.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-bold bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-slate-700"
                    onClick={() => {
                      setFormData({
                        email: 'demo@enhanceus.org',
                        password: 'DemoPassword123!',
                        remember: true,
                      });
                    }}
                  >
                    Auto-Fill Demo Credentials
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                Register now
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Working Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => {
          setIsForgotModalOpen(false);
          setForgotSuccess('');
          setForgotError('');
        }}
        title="Reset Account Password"
        description="Enter your registered email address to receive a secure password reset link"
      >
        <div className="space-y-4 text-xs">
          {forgotSuccess ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 leading-relaxed">
                {forgotSuccess}
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    setIsForgotModalOpen(false);
                    setForgotSuccess('');
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setForgotLoading(true);
                setForgotError('');
                try {
                  const res = await forgotPassword(forgotEmail);
                  setForgotSuccess(
                    res.data?.message ||
                      'If an account exists with this email address, a password reset link has been dispatched to your inbox.'
                  );
                } catch (err) {
                  setForgotError(
                    err.response?.data?.message ||
                      err.message ||
                      'Failed to process password reset request. Please try again.'
                  );
                } finally {
                  setForgotLoading(false);
                }
              }}
              className="space-y-3"
            >
              {forgotError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300">
                  {forgotError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  required
                  placeholder="you@example.com"
                  icon={Mail}
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={forgotLoading}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsForgotModalOpen(false)}
                  disabled={forgotLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={forgotLoading}
                >
                  Send Reset Link
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
};

export default LoginPage;
