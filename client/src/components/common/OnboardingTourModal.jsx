import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  UserCheck,
  Target,
  Zap,
  Users,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { completeOnboarding, dismissOnboarding } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';

export const OnboardingTourModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const tourSteps = [
    {
      step: 1,
      title: 'Welcome to EnhanceUs',
      subtitle: 'Goal-driven skill exchange platform',
      icon: Compass,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      description:
        'Start with what you want to accomplish. EnhanceUs helps you identify the skills you need and connect with people who can exchange knowledge with you.',
      bulletPoints: [
        'Define concrete target projects instead of static skill tags',
        'Receive automated skill gap analysis',
        'Exchange knowledge through 1-on-1 reciprocal learning',
      ],
    },
    {
      step: 2,
      title: 'Build Your Skill Profile',
      subtitle: 'Teach what you know, learn what you need',
      icon: UserCheck,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      description:
        'Add skills you can share with peers and skills you want to learn. Accurate skill profiles power our reciprocal matching algorithm.',
      bulletPoints: [
        'Specify proficiency levels (Beginner to Expert)',
        'Set schedule availability (Flexible, Weekdays, Weekends)',
        'List learning interests to match with expert teachers',
      ],
    },
    {
      step: 3,
      title: 'Define Your Goal',
      subtitle: 'Natural language goal blueprints',
      icon: Target,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      description:
        'Describe your objective in plain text. You do not need to know every technical requirement upfront—EnhanceUs extracts the necessary skills automatically.',
      bulletPoints: [
        'Example: "Build a full-stack SaaS app with payment integration"',
        'Identify core technical stack requirements automatically',
        'Track goal progress as you complete learning sessions',
      ],
    },
    {
      step: 4,
      title: 'Understand Your Skill Gaps',
      subtitle: 'Instant requirement vs capability matrix',
      icon: Zap,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      description:
        'EnhanceUs compares your goal’s required skills with your profile skills to pinpoint exact missing knowledge.',
      bulletPoints: [
        'Known Skills: Strengths you already bring to the table',
        'Developing Skills: Knowledge you can refine with mentorship',
        'Missing Skills: Gaps that will be targeted for peer matches',
      ],
    },
    {
      step: 5,
      title: 'Discover Compatible Peers',
      subtitle: 'High-quality reciprocal matching',
      icon: Users,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      description:
        'Find community members whose teaching skills match your goal gaps, and whose learning goals match what you can teach.',
      bulletPoints: [
        'Reciprocal match scoring (0-100% compatibility)',
        'Transparent explanations for why a match was suggested',
        'Direct 1-on-1 exchange requests',
      ],
    },
    {
      step: 6,
      title: 'Start an Exchange & Collaborate',
      subtitle: 'Request, connect, message & review',
      icon: MessageSquare,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      description:
        'Once a peer accepts your exchange request, launch direct messaging, schedule exchange sessions, and build reputation through mutual reviews.',
      bulletPoints: [
        'Built-in peer messaging & session scheduling',
        'Verified completed session tracking',
        'Earn teaching hours and community reputation',
      ],
    },
    {
      step: 7,
      title: 'Ready to Begin Your Journey!',
      subtitle: 'Create your first goal blueprint',
      icon: Sparkles,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      description:
        'You are all set! Define your first goal now to analyze skill gaps and find your ideal exchange partners.',
      bulletPoints: [
        'Takes less than 2 minutes to create a goal',
        'Immediate skill gap analysis',
        'Zero cost, 100% reciprocal knowledge exchange',
      ],
      isFinal: true,
    },
  ];

  const handleFinishOrDismiss = async (isCompletion = false) => {
    setIsSubmitting(true);
    try {
      localStorage.setItem('enhanceus_tour_dismissed', 'true');
      if (isCompletion) {
        await completeOnboarding();
        if (user) {
          setUser({ ...user, onboardingCompletedAt: new Date().toISOString() });
        }
      } else {
        await dismissOnboarding();
        if (user) {
          setUser({ ...user, dismissedOnboardingAt: new Date().toISOString() });
        }
      }
    } catch (e) {
      console.warn('[Onboarding Save Error]', e.message);
    } finally {
      setIsSubmitting(false);
      onClose();
      if (isCompletion) {
        navigate('/goals');
      }
    }
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinishOrDismiss(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const current = tourSteps[currentStep];
  const StepIcon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {/* Top Progress Line */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
          <div
            className="bg-gradient-to-r from-teal-500 to-indigo-600 h-1.5 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
          />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <Badge variant="slate" className="text-[11px] font-bold">
            Step {currentStep + 1} of {tourSteps.length}
          </Badge>
          <button
            onClick={() => handleFinishOrDismiss(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            title="Skip tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 flex-1">
          <div className="flex items-center gap-3.5 mb-4">
            {currentStep === 0 ? (
              <img
                src="/favicon.png"
                alt="EnhanceUs Logo"
                className="w-12 h-12 rounded-2xl object-contain shadow-sm border border-teal-200 dark:border-teal-800"
              />
            ) : (
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${current.color}`}>
                <StepIcon className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">{current.title}</h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{current.subtitle}</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">{current.description}</p>

          {/* Bullet Points */}
          <div className="space-y-2.5 bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-4">
            {current.bulletPoints.map((pt, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                <span className="leading-normal">{pt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => handleFinishOrDismiss(false)}
            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                leftIcon={ChevronLeft}
                className="text-xs"
              >
                Back
              </Button>
            )}

            {current.isFinal ? (
              <Button
                size="sm"
                onClick={() => handleFinishOrDismiss(true)}
                isLoading={isSubmitting}
                rightIcon={Sparkles}
                className="bg-teal-600 hover:bg-teal-700 text-xs px-5 shadow-sm"
              >
                Create Your First Goal
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleNext}
                rightIcon={ChevronRight}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-xs px-5"
              >
                Next
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default OnboardingTourModal;
