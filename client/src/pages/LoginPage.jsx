import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, Info } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';

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
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
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
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs font-medium text-teal-600 hover:underline"
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
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={formData.remember}
                    onChange={handleChange}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Remember session on this device</span>
                </label>
              </div>

              <Button type="submit" isLoading={loading} className="mt-2 w-full">
                Log In
              </Button>
            </form>

            {/* Explore Demo Account Section */}
            <div className="mt-6 pt-5 border-t border-slate-200/80">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                    Explore Demo Account
                  </span>
                  <span className="text-[10px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded-full">
                    Instant Access
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  Want to test EnhanceUs without registering? Explore our pre-configured goal blueprint and reciprocal matching demo account.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs font-bold bg-white text-teal-700 border-teal-300 hover:bg-teal-50"
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

            <p className="text-center text-xs text-slate-500 mt-6">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-semibold text-teal-600 hover:underline">
                Register now
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password Architecture Foundation Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Password Reset Architecture"
        description="EnhanceUs Password Recovery Protocol"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2.5">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Architectural Note & Service Limitation:</p>
              <p className="leading-relaxed">
                Automated email password recovery requires an external transactional SMTP email service (e.g. Resend / SendGrid), which is intentionally excluded to keep EnhanceUs 100% free and open-source without SaaS dependencies.
              </p>
            </div>
          </div>
          <p>
            In production environments, password reset tokens are dispatched via encrypted email links. For local testing, password updates can be performed directly or via API endpoints.
          </p>
          <div className="flex justify-end pt-2">
            <Button size="sm" variant="outline" onClick={() => setIsForgotModalOpen(false)}>
              Understood
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default LoginPage;
