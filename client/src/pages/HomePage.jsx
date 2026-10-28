import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Target,
  ArrowRight,
  Zap,
  Users,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Sparkles,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import GoalPipelineVisual from '../components/common/GoalPipelineVisual';
import usePageMeta from '../hooks/usePageMeta';

export const HomePage = () => {
  const { isAuthenticated } = useAuth();

  usePageMeta(
    'EnhanceUs - Goal-Driven Peer Skill Exchange',
    'EnhanceUs is a goal-driven peer-to-peer skill exchange platform that identifies capability gaps and connects you with verified mentors and collaborative learners.',
    'https://www.briefenai.me/'
  );

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
        <PageContainer>
          <div className="text-center max-w-4xl mx-auto mb-12">
            <Badge variant="teal" icon={Target} className="mb-4 py-1.5 px-3.5 text-xs tracking-wide">
              Goal-Driven Skill Exchange Platform
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-[1.15] mb-6">
              Don't just learn skills.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-indigo-600 dark:from-teal-400 dark:to-indigo-400">
                Build what you're capable of.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
              Tell EnhanceUs what you want to accomplish. We'll map the skills you need and help you find people who can grow with you through mutual exchange.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" rightIcon={ArrowRight} className="px-7 py-3 text-base shadow-md">
                  Define Your Goal
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="px-7 py-3 text-base">
                  How It Works
                </Button>
              </a>
            </div>
          </div>

          {/* Hero Visual Pipeline Representation */}
          <div className="max-w-5xl mx-auto mt-4">
            <GoalPipelineVisual />
          </div>
        </PageContainer>
      </section>

      {/* 2. HOW ENHANCEUS WORKS */}
      <section id="how-it-works" className="py-16 md:py-24 bg-white dark:bg-slate-900/60 border-y border-slate-200/80 dark:border-slate-800 transition-colors">
        <PageContainer>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="indigo" icon={Compass} className="mb-3">
              The 5-Step Process
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              How EnhanceUs Transforms Goals Into Action
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
              A structured progression designed for targeted learning and genuine peer accountability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              {
                num: '01',
                title: 'Define your goal',
                desc: 'Describe what project or objective you want to complete, not just generic skill tags.',
                icon: Target,
                color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60',
              },
              {
                num: '02',
                title: 'Discover skill gaps',
                desc: 'EnhanceUs analyzes your objective against existing skills to pinpoint exact missing knowledge.',
                icon: Zap,
                color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
              },
              {
                num: '03',
                title: 'Find complement peers',
                desc: 'Connect with people who possess the skills you need and need the skills you can share.',
                icon: Users,
                color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60',
              },
              {
                num: '04',
                title: 'Exchange knowledge',
                desc: 'Engage in structured, reciprocal learning sessions focused on real application.',
                icon: BookOpen,
                color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
              },
              {
                num: '05',
                title: 'Reach your goal',
                desc: 'Ship your project, achieve your milestone, and build lasting capability.',
                icon: TrendingUp,
                color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <Card key={step.num} hover className="flex flex-col justify-between relative">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black text-slate-300 dark:text-slate-700 font-mono">{step.num}</span>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${step.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">{step.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </PageContainer>
      </section>

      {/* 3. THE PROBLEM & 4. THE ENHANCEUS APPROACH */}
      <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-950 transition-colors">
        <PageContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* The Problem */}
            <Card className="border-rose-200/80 dark:border-rose-900/60 bg-gradient-to-br from-white to-rose-50/30 dark:from-slate-900 dark:to-rose-950/20 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center mb-4">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">The Problem With Traditional Learning</h3>
                <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <span><strong>Passive Tutorial Isolation:</strong> Watching video courses without applying skills to real-world outcomes leads to rapid forgetting.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <span><strong>Unfocused Skill Exchanges:</strong> Standard skill-swaps match static interests without context, resulting in superficial conversations.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <span><strong>Lack of Goal Alignment:</strong> Learning in a vacuum lacks accountability and clear benchmarks for completion.</span>
                  </li>
                </ul>
              </div>
              <Badge variant="rose" className="w-fit">Broken Status Quo</Badge>
            </Card>

            {/* The EnhanceUs Approach */}
            <Card className="border-teal-200/80 dark:border-teal-900/60 bg-gradient-to-br from-white to-teal-50/30 dark:from-slate-900 dark:to-teal-950/20 flex flex-col justify-between">
              <div>
                <img
                  src="/favicon.png"
                  alt="EnhanceUs Logo"
                  className="w-10 h-10 rounded-xl object-contain mb-4 shadow-sm"
                />
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">The EnhanceUs Approach</h3>
                <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                    <span><strong>Goal-Driven Context:</strong> Every exchange starts with a concrete target project, defining exact scope and deliverables.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                    <span><strong>Skill Gap Intelligence:</strong> EnhanceUs identifies precisely which skills you lack to complete your specific goal.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                    <span><strong>Mutual Reciprocal Fit:</strong> Connect with peers where your strength covers their gap and their expertise solves yours.</span>
                  </li>
                </ul>
              </div>
              <Badge variant="teal" className="w-fit">The EnhanceUs Way</Badge>
            </Card>

          </div>
        </PageContainer>
      </section>

      {/* 5. EXAMPLE GOAL TRANSFORMATION */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-900/60 border-y border-slate-200/80 dark:border-slate-800 transition-colors">
        <PageContainer>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="teal" icon={Target} className="mb-3">
              Real-World Scenario
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              From Goal to Execution: A Live Transformation
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
              See how EnhanceUs turns an ambitious project into structured peer growth.
            </p>
          </div>

          <Card className="max-w-4xl mx-auto border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-white to-indigo-50/20 dark:from-slate-900 dark:to-indigo-950/20 p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">USER GOAL</span>
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mb-1">Launch an AI-Powered Mobile App</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Targeting iOS App Store release in 6 weeks.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
                  <Badge variant="slate">User: Maya</Badge>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-teal-200 dark:border-teal-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block mb-2">SKILL GAP IDENTIFIED</span>
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mb-1">React Native & FastAPI Serving</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Maya has strong UX & Python skills, but needs React Native & API deployment guidance.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <Badge variant="teal">Gap Mapped</Badge>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-2">PEER MATCH FOUND</span>
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mb-1">Matched with David</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">David is a Mobile Engineer wanting to learn Python ML pipelines. Perfect mutual fit!</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <Badge variant="indigo">Mutual Match</Badge>
                </div>
              </div>

            </div>
          </Card>
        </PageContainer>
      </section>

      {/* 6. SKILL EXCHANGE CONCEPT & 7. WHY MUTUAL LEARNING MATTERS */}
      <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-950 transition-colors">
        <PageContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <Card hover>
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-4">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">The Pure Exchange Concept</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Knowledge exchange is non-monetary and built on equal reciprocity. By offering your existing domain strengths, you unlock access to specialized expertise without subscription paywalls.
              </p>
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 inline-flex items-center gap-1">
                Reciprocal growth over transactional software <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </Card>

            <Card hover>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Why Mutual Learning Works</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Teaching a peer solidifies 90% of your own knowledge. When both partners are invested in each other's goals, retention skyrockets and project completion rates double compared to self-study.
              </p>
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-1">
                Active teaching & peer accountability <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </Card>

          </div>
        </PageContainer>
      </section>

      {/* 8. CALL TO ACTION */}
      <section className="py-16 md:py-20 bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <Badge variant="teal" className="mb-4 bg-teal-500/20 text-teal-300 border-teal-500/30">
            Start Today
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Ready to accomplish your next big goal?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 dark:text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Create your profile, define your target project, and connect with people who can help you achieve it.
          </p>
          <Link to="/register">
            <Button size="lg" rightIcon={ArrowRight} className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold px-8 py-3.5 text-base">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
