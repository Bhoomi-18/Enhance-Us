import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, BookOpen, Award, Clock, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import usePageMeta from '../hooks/usePageMeta';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  usePageMeta('Create an Account | EnhanceUs', 'Join EnhanceUs to map your learning goals, exchange skills with peers, and build verified capabilities.');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    bio: '',
    skills: [{ name: '', level: 'intermediate' }],
    learningInterests: [{ name: '', priority: 'high' }],
    availability: 'flexible',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  // Skill Offering Helpers
  const handleSkillChange = (index, field, value) => {
    const updated = [...formData.skills];
    updated[index][field] = value;
    setFormData({ ...formData, skills: updated });
  };

  const addSkillField = () => {
    setFormData({
      ...formData,
      skills: [...formData.skills, { name: '', level: 'intermediate' }],
    });
  };

  const removeSkillField = (index) => {
    const updated = formData.skills.filter((_, i) => i !== index);
    setFormData({ ...formData, skills: updated });
  };

  // Learning Interest Helpers
  const handleInterestChange = (index, field, value) => {
    const updated = [...formData.learningInterests];
    updated[index][field] = value;
    setFormData({ ...formData, learningInterests: updated });
  };

  const addInterestField = () => {
    setFormData({
      ...formData,
      learningInterests: [...formData.learningInterests, { name: '', priority: 'high' }],
    });
  };

  const removeInterestField = (index) => {
    const updated = formData.learningInterests.filter((_, i) => i !== index);
    setFormData({ ...formData, learningInterests: updated });
  };

  // Validation before advancing from Step 1
  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('Please enter your full name');
      return false;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && !validateStep1()) return;
    setError(null);
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1 && !validateStep1()) return;

    setLoading(true);
    setError(null);

    try {
      // Clean empty skills & interests
      const cleanedSkills = formData.skills.filter((s) => s.name.trim() !== '');
      const cleanedInterests = formData.learningInterests.filter((i) => i.name.trim() !== '');

      const payload = {
        ...formData,
        skills: cleanedSkills,
        learningInterests: cleanedInterests,
      };

      await register(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-xl mx-auto py-8">
        
        {/* Step Indicator Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
            <span>Step {step} of 5</span>
            <span>
              {step === 1 && 'Credentials'}
              {step === 2 && 'About You'}
              {step === 3 && 'Skills You Can Teach'}
              {step === 4 && 'Skills You Want to Learn'}
              {step === 5 && 'Availability'}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <img
              src="/favicon.png"
              alt="EnhanceUs Logo"
              className="w-14 h-14 mx-auto mb-3 rounded-2xl object-contain shadow-sm"
            />
            <CardTitle>
              {step === 1 && 'Create Your EnhanceUs Account'}
              {step === 2 && 'Tell Us About Yourself (Optional)'}
              {step === 3 && 'What Skills Can You Share? (Optional)'}
              {step === 4 && 'What Skills Do You Want to Gain? (Optional)'}
              {step === 5 && 'Availability & Timezone (Optional)'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Enter your basic login details to start defining goals.'}
              {step === 2 && 'A short introduction helps peers get to know your background.'}
              {step === 3 && 'List skills you are comfortable helping others learn.'}
              {step === 4 && 'List target knowledge areas you want to master.'}
              {step === 5 && 'Set preferred collaboration times for peer sessions.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={step === 5 ? handleSubmit : (e) => e.preventDefault()}>
              
              {/* STEP 1: Account Credentials */}
              {step === 1 && (
                <div className="space-y-4">
                  <Input
                    label="Full Name *"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Alex Morgan"
                    icon={User}
                    required
                  />
                  <Input
                    label="Email Address *"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    icon={Mail}
                    required
                  />
                  <Input
                    label="Password *"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    icon={Lock}
                    required
                  />
                </div>
              )}

              {/* STEP 2: Bio */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Short Bio / Introduction
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Share a brief overview of your background and what you love building..."
                      className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Skills to Teach */}
              {step === 3 && (
                <div className="space-y-4">
                  {formData.skills.map((skill, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Skill name (e.g. React, Python)"
                          value={skill.name}
                          onChange={(e) => handleSkillChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <select
                        value={skill.level}
                        onChange={(e) => handleSkillChange(index, 'level', e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                      {formData.skills.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSkillField(index)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={addSkillField} leftIcon={Plus}>
                    Add Another Skill
                  </Button>
                </div>
              )}

              {/* STEP 4: Learning Interests */}
              {step === 4 && (
                <div className="space-y-4">
                  {formData.learningInterests.map((interest, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Target skill (e.g. Machine Learning, System Design)"
                          value={interest.name}
                          onChange={(e) => handleInterestChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <select
                        value={interest.priority}
                        onChange={(e) => handleInterestChange(index, 'priority', e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                      </select>
                      {formData.learningInterests.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInterestField(index)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={addInterestField} leftIcon={Plus}>
                    Add Target Learning Interest
                  </Button>
                </div>
              )}

              {/* STEP 5: Availability */}
              {step === 5 && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Preferred Availability
                    </label>
                    <select
                      name="availability"
                      value={formData.availability}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="flexible">Flexible / Any time</option>
                      <option value="weekdays">Weekdays</option>
                      <option value="weekends">Weekends</option>
                      <option value="evenings">Evenings</option>
                    </select>
                  </div>

                  <Input
                    label="Timezone"
                    type="text"
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    icon={Clock}
                  />
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {step > 1 ? (
                  <Button type="button" variant="outline" size="sm" onClick={handlePrevStep} leftIcon={ArrowLeft}>
                    Previous
                  </Button>
                ) : (
                  <span />
                )}

                {step < 5 ? (
                  <div className="flex items-center gap-2">
                    {step > 1 && (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-2"
                      >
                        Skip for now
                      </button>
                    )}
                    <Button type="button" size="sm" onClick={handleNextStep} rightIcon={ArrowRight}>
                      Continue
                    </Button>
                  </div>
                ) : (
                  <Button type="button" size="md" onClick={handleSubmit} isLoading={loading} rightIcon={CheckCircle2}>
                    Complete Registration
                  </Button>
                )}
              </div>

            </form>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                Log In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default RegisterPage;
