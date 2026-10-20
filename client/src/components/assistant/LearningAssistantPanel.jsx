import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Award,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Check,
  ChevronDown,
  ChevronUp,
  Target,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  queryAssistant,
  evaluateAnswer,
  getAssistantConversation,
  clearAssistantConversation,
} from '../../services/assistantService';

export const LearningAssistantPanel = ({
  roadmap = null,
  roadmapId = null,
  focusMilestone = null,
  activeMilestone = null,
  activeSkillName = '',
  onSelectMilestone = null,
  onClose = null,
}) => {
  const effectiveRoadmapId = roadmapId || roadmap?._id;
  const [selectedMilestone, setSelectedMilestone] = useState(focusMilestone || activeMilestone || null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [revealedHints, setRevealedHints] = useState({});
  const [quizSubmissions, setQuizSubmissions] = useState({});
  const [evaluatingQuestionId, setEvaluatingQuestionId] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (focusMilestone !== undefined) {
      setSelectedMilestone(focusMilestone);
    } else if (activeMilestone !== undefined) {
      setSelectedMilestone(activeMilestone);
    }
  }, [focusMilestone, activeMilestone]);

  useEffect(() => {
    fetchConversation();
  }, [effectiveRoadmapId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const fetchConversation = async () => {
    if (!effectiveRoadmapId) return;
    try {
      const res = await getAssistantConversation(effectiveRoadmapId);
      if (res?.data?.data?.messages) {
        setMessages(res.data.data.messages);
      }
    } catch (err) {
      console.warn('[AssistantPanel] Could not load conversation history:', err.message);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your conversation history for this roadmap?')) {
      return;
    }
    try {
      await clearAssistantConversation(effectiveRoadmapId);
      setMessages([]);
      setRevealedHints({});
      setQuizSubmissions({});
    } catch (err) {
      alert(err.message || 'Failed to clear conversation');
    }
  };

  const handleSendAction = async (actionType, customQuery = '') => {
    const q = customQuery || inputQuery;
    if (!q.trim() && actionType === 'GENERAL_QUERY') return;

    setError(null);
    setIsLoading(true);
    setInputQuery('');

    const optimisticUserMsg = {
      _id: `temp_${Date.now()}`,
      role: 'user',
      content: q.trim() || getDefaultActionLabel(actionType),
      actionType,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      const res = await queryAssistant({
        roadmapId: effectiveRoadmapId,
        milestoneId: selectedMilestone?.milestoneId || null,
        actionType,
        query: q.trim(),
      });

      if (res?.data?.data) {
        const assistantMsg = {
          _id: `res_${Date.now()}`,
          role: 'assistant',
          content: res.data.data.content,
          actionType: res.data.data.actionType,
          structuredData: res.data.data.structuredData,
          suggestedResources: res.data.data.suggestedResources,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'AI assistant request failed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizAnswer = async (question, optionKey) => {
    try {
      setEvaluatingQuestionId(question.id);
      const res = await evaluateAnswer({
        questionId: question.id,
        selectedAnswer: optionKey,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      });

      if (res?.data?.data) {
        setQuizSubmissions((prev) => ({
          ...prev,
          [question.id]: res.data.data,
        }));
      }
    } catch (err) {
      alert(err.message || 'Could not evaluate quiz answer');
    } finally {
      setEvaluatingQuestionId(null);
    }
  };

  const toggleHint = (exerciseKey, hintIndex) => {
    const key = `${exerciseKey}_h${hintIndex}`;
    setRevealedHints((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getDefaultActionLabel = (actionType) => {
    switch (actionType) {
      case 'EXPLAIN_CONCEPT':
        return `Explain concept: ${selectedMilestone?.skillName || activeSkillName || 'Current Skill'}`;
      case 'GUIDE_MILESTONE':
        return `Guide milestone completion`;
      case 'HELP_BLOCKER':
        return `Help me resolve learning blocker`;
      case 'PRACTICE_EXERCISE':
        return `Give me a hands-on practice exercise`;
      case 'KNOWLEDGE_CHECK':
        return `Quiz my understanding`;
      case 'PEER_PREP':
        return `Prepare questions for peer mentor`;
      case 'SUMMARIZE_PROGRESS':
        return `Summarize my learning progress`;
      default:
        return 'Learning guidance';
    }
  };

  return (
    <div className="flex flex-col h-[650px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Context Top Header */}
      <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              EnhanceUs AI Learning Coach
              <Badge variant="teal" className="text-[9px] uppercase px-1.5 py-0">
                Contextual V2.4
              </Badge>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm">
              {selectedMilestone ? (
                <>
                  Focused on: <strong className="text-slate-700 dark:text-slate-300">{selectedMilestone.title}</strong>
                </>
              ) : (
                'Roadmap & Skill Context Active'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Milestone Selector Dropdown */}
          {roadmap?.milestones && roadmap.milestones.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="coach-milestone-select" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Milestone:
              </label>
              <select
                id="coach-milestone-select"
                value={selectedMilestone?.milestoneId || ''}
                onChange={(e) => {
                  const ms = roadmap.milestones.find((m) => m.milestoneId === e.target.value) || null;
                  setSelectedMilestone(ms);
                  if (onSelectMilestone) onSelectMilestone(ms);
                }}
                className="text-xs py-1 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 max-w-[200px] truncate"
              >
                <option value="">Full Roadmap Scope</option>
                {roadmap.milestones.map((m) => (
                  <option key={m.milestoneId} value={m.milestoneId}>
                    {m.title} ({m.status.toLowerCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              title="Clear conversation"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Suggested Starter Action Chips */}
      <div className="p-2.5 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold scrollbar-none">
        <button
          onClick={() => handleSendAction('EXPLAIN_CONCEPT')}
          disabled={isLoading}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-all"
        >
          <Lightbulb className="w-3 h-3 text-amber-500" />
          Explain Concept
        </button>

        <button
          onClick={() => handleSendAction('GUIDE_MILESTONE')}
          disabled={isLoading}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-all"
        >
          <Target className="w-3 h-3 text-teal-500" />
          Guide Milestone
        </button>

        <button
          onClick={() => handleSendAction('PRACTICE_EXERCISE')}
          disabled={isLoading}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-all"
        >
          <Award className="w-3 h-3 text-indigo-500" />
          Practice Exercise
        </button>

        <button
          onClick={() => handleSendAction('KNOWLEDGE_CHECK')}
          disabled={isLoading}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-all"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          Knowledge Quiz
        </button>

        <button
          onClick={() => handleSendAction('HELP_BLOCKER')}
          disabled={isLoading}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-all"
        >
          <HelpCircle className="w-3 h-3 text-rose-500" />
          Help With Blocker
        </button>

        <button
          onClick={() => handleSendAction('PEER_PREP')}
          disabled={isLoading}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-all"
        >
          <Users className="w-3 h-3 text-sky-500" />
          Peer Prep
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Welcome to your EnhanceUs Learning Coach
              </h4>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                I know your active roadmap, current milestone, and learning sequence. Ask me anything, request a practice drill, or test your comprehension with a quick quiz!
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg._id || idx}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-teal-600 text-white rounded-br-none'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-none'
                  }`}
                >
                  {/* Markdown or plain text content */}
                  <div className="whitespace-pre-wrap leading-relaxed space-y-1">
                    {msg.content}
                  </div>

                  {/* Structured Practice Exercise Card */}
                  {msg.structuredData?.instructions && (
                    <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 space-y-2">
                      <div className="font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        Exercise: {msg.structuredData.title}
                      </div>

                      {/* Progressive Hints Accordion */}
                      {msg.structuredData.hints && msg.structuredData.hints.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          {msg.structuredData.hints.map((hint, hIdx) => {
                            const hintKey = `${msg._id}_h${hIdx}`;
                            const isRevealed = revealedHints[hintKey];
                            return (
                              <div key={hIdx} className="text-[11px]">
                                <button
                                  onClick={() => toggleHint(msg._id, hIdx)}
                                  className="text-teal-600 dark:text-teal-400 font-bold hover:underline inline-flex items-center gap-1"
                                >
                                  {isRevealed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  {isRevealed ? `Hide Hint ${hIdx + 1}` : `Reveal Hint ${hIdx + 1}`}
                                </button>
                                {isRevealed && (
                                  <p className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-slate-600 dark:text-slate-300 mt-1 italic">
                                    {hint}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Structured Knowledge Check Quiz */}
                  {msg.structuredData?.questions && (
                    <div className="mt-3 space-y-3">
                      {msg.structuredData.questions.map((q) => {
                        const submission = quizSubmissions[q.id];
                        const isAnswered = Boolean(submission);

                        return (
                          <div
                            key={q.id}
                            className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-slate-800 dark:text-slate-200"
                          >
                            <p className="font-bold text-[11px] leading-relaxed">
                              {q.question}
                            </p>

                            <div className="space-y-1.5">
                              {q.options.map((opt) => {
                                const isSelected = submission?.selectedAnswer === opt.key;
                                const isCorrectOpt = q.correctAnswer === opt.key;

                                let optClass = 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-700/60';
                                if (isAnswered) {
                                  if (isCorrectOpt) {
                                    optClass = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-200 font-bold';
                                  } else if (isSelected && !submission.isCorrect) {
                                    optClass = 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-800 dark:text-rose-200 line-through';
                                  } else {
                                    optClass = 'opacity-60 border-slate-200 dark:border-slate-700';
                                  }
                                }

                                return (
                                  <button
                                    key={opt.key}
                                    disabled={isAnswered || evaluatingQuestionId === q.id}
                                    onClick={() => handleQuizAnswer(q, opt.key)}
                                    className={`w-full text-left p-2 rounded-lg border text-[11px] flex items-center justify-between transition-colors ${optClass}`}
                                  >
                                    <span>
                                      <strong className="mr-1.5">{opt.key})</strong> {opt.text}
                                    </span>
                                    {isAnswered && isCorrectOpt && (
                                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Answer Feedback Explanation */}
                            {submission && (
                              <div
                                className={`p-2.5 rounded-lg text-[11px] leading-relaxed space-y-1 ${
                                  submission.isCorrect
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                <span className="font-extrabold block">{submission.feedback}</span>
                                <p>{submission.explanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start space-y-1">
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl rounded-bl-none p-3.5 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 text-slate-500 text-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
              <span>Thinking within your roadmap context...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendAction('GENERAL_QUERY', inputQuery)}
              className="text-[11px] py-1 h-auto"
            >
              Retry
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <textarea
          rows={1}
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendAction('GENERAL_QUERY');
            }
          }}
          placeholder="Ask a question about this skill or milestone..."
          className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none max-h-24"
        />
        <Button
          variant="teal"
          size="sm"
          disabled={isLoading || !inputQuery.trim()}
          onClick={() => handleSendAction('GENERAL_QUERY')}
          className="font-bold text-xs px-3.5 py-2.5 shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default LearningAssistantPanel;
