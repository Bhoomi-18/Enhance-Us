import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Sparkles, Cpu, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { createGoal } from '../../services/goalService';

export const GoalCreateModal = ({ isOpen, onClose, onGoalCreated }) => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [error, setError] = useState(null);

  const inspirations = [
    { title: 'Build my first mobile app', desc: 'Create a cross-platform mobile app for tracking daily habits with React Native and Node.' },
    { title: 'Launch a photography portfolio', desc: 'Design and deploy a modern portfolio website showcasing high-res photography and client galleries.' },
    { title: 'Create an AI-powered website', desc: 'Develop a web app with automated content generation using Python backend and React frontend.' },
    { title: 'Become a better public speaker', desc: 'Master keynote presentations, storytelling, and confident pitch delivery for tech conferences.' },
  ];

  const handleSelectInspiration = (item) => {
    setTitle(item.title);
    setDescription(item.desc);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide both a goal title and description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    // Simulate realistic visual AI/NLP skill extraction sequence
    setAnalysisStep(1); // Extracting skills
    await new Promise((r) => setTimeout(r, 900));

    setAnalysisStep(2); // Matching against user profile
    await new Promise((r) => setTimeout(r, 800));

    try {
      const response = await createGoal({ title: title.trim(), description: description.trim() });
      const createdGoal = response?.data?.goal;

      if (onGoalCreated) onGoalCreated(createdGoal);
      onClose();
      
      if (createdGoal?._id) {
        navigate(`/goals/${createdGoal._id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze goal. Please try again.');
      setIsAnalyzing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isAnalyzing ? () => {} : onClose}
      title="Define Your Goal Blueprint"
      description="Tell EnhanceUs what you want to accomplish in natural language."
      className="max-w-2xl"
    >
      {isAnalyzing ? (
        <div className="py-12 px-4 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center relative">
            <Cpu className="w-8 h-8 animate-pulse" />
            <Sparkles className="w-5 h-5 text-indigo-500 absolute -top-1 -right-1 animate-spin" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Analyzing Your Goal Blueprint</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Our skill gap engine is extracting required technical competencies and comparing them against your current profile...
            </p>
          </div>

          <div className="max-w-xs mx-auto space-y-3 text-xs text-left">
            <div className={`p-2.5 rounded-xl flex items-center gap-2 transition-colors ${analysisStep >= 1 ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>1. Extracting Required Competencies...</span>
            </div>
            <div className={`p-2.5 rounded-xl flex items-center gap-2 transition-colors ${analysisStep >= 2 ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>2. Calculating Skill Gap Matrix...</span>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Inspiration Quick Selection */}
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Inspiration Examples (Click to populate)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {inspirations.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectInspiration(item)}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-left hover:border-teal-500 hover:bg-teal-50/50 transition-colors text-xs"
                >
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-teal-600" /> {item.title}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Natural Language Goal Input */}
          <div className="space-y-4">
            <Input
              label="Goal Title *"
              placeholder="e.g. Build an AI-Powered Web Application"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Describe What You Want To Accomplish *
              </label>
              <textarea
                rows={4}
                placeholder="Describe your desired outcome in plain language. Mention key features or deliverables (e.g. 'I want to build a React dashboard with a Node backend that connects to MongoDB and serves AI model predictions')..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="md" rightIcon={ArrowRight}>
              Analyze & Generate Blueprint
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default GoalCreateModal;
