import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Plus,
  Edit3,
  Trash2,
  Lock,
  Globe,
  Users,
  Briefcase,
  BookOpen,
  Calendar,
  Sparkles,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import PortfolioItemModal from './PortfolioItemModal';
import ConfirmExchangeModal from './ConfirmExchangeModal';
import {
  getUserPortfolio,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  confirmExchangeOutcome,
} from '../../services/portfolioService';

export const PortfolioSection = ({ targetUserId, isOwner = false, userSkills = [] }) => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ totalItems: 0, confirmedCount: 0, evidenceCount: 0, selfReportedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state: 'ALL' | 'EXCHANGE_CONFIRMED' | 'PORTFOLIO_EVIDENCE' | 'SELF_REPORTED'
  const [activeTier, setActiveTier] = useState('ALL');

  // Modal states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const fetchPortfolio = async () => {
    if (!targetUserId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getUserPortfolio(targetUserId);
      if (res?.data) {
        setItems(res.data.items || []);
        setStats(res.data.stats || { totalItems: 0, confirmedCount: 0, evidenceCount: 0, selfReportedCount: 0 });
      }
    } catch (err) {
      setError(err.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [targetUserId]);

  const handleSaveItem = async (formData) => {
    if (editingItem) {
      await updatePortfolioItem(editingItem._id, formData);
    } else {
      await createPortfolioItem(formData);
    }
    await fetchPortfolio();
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to remove this portfolio item?')) return;
    try {
      await deletePortfolioItem(itemId);
      await fetchPortfolio();
    } catch (err) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const handleConfirmExchange = async (data) => {
    await confirmExchangeOutcome(data);
    await fetchPortfolio();
  };

  const filteredItems = items.filter((item) => {
    if (activeTier === 'ALL') return true;
    return item.verificationStatus === activeTier;
  });

  return (
    <Card className="border-teal-200/80 dark:border-teal-900/40 bg-gradient-to-b from-white via-slate-50/20 to-white dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-900">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
                <Award className="w-4 h-4" />
              </div>
              <CardTitle className="text-lg">Proof-of-Skill Portfolio</CardTitle>
            </div>
            <CardDescription>
              Tangible artifacts, verified exchange outcomes, and auditable proof of practical capabilities.
            </CardDescription>
          </div>

          {isOwner && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={ShieldCheck}
                onClick={() => setIsConfirmModalOpen(true)}
                className="text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                Claim Exchange Outcome
              </Button>
              <Button
                size="sm"
                leftIcon={Plus}
                onClick={() => {
                  setEditingItem(null);
                  setIsItemModalOpen(true);
                }}
              >
                Add Artifact
              </Button>
            </div>
          )}
        </div>

        {/* Verification Tier Summary Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">TOTAL ARTIFACTS</span>
            <span className="text-lg font-black text-slate-900 dark:text-slate-100">{stats.totalItems}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">EXCHANGE-CONFIRMED</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.confirmedCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">PORTFOLIO EVIDENCE</span>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{stats.evidenceCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">SELF-REPORTED</span>
            <span className="text-lg font-black text-slate-600 dark:text-slate-300">{stats.selfReportedCount}</span>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3">
          {[
            { id: 'ALL', label: `All Artifacts (${stats.totalItems})` },
            { id: 'EXCHANGE_CONFIRMED', label: `Exchange-Confirmed (${stats.confirmedCount})` },
            { id: 'PORTFOLIO_EVIDENCE', label: `Evidence-Backed (${stats.evidenceCount})` },
            { id: 'SELF_REPORTED', label: `Self-Reported (${stats.selfReportedCount})` },
          ].map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setActiveTier(tier.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTier === tier.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="md" label="Loading proof-of-skill records..." />
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs text-center">
            {error}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Portfolio Items in this Category</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {isOwner
                ? 'Add evidence of your work, projects, or confirm past exchange sessions to build an authentic reputation.'
                : 'This user has not published items under this filter yet.'}
            </p>
            {isOwner && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={Plus}
                onClick={() => {
                  setEditingItem(null);
                  setIsItemModalOpen(true);
                }}
                className="mt-4"
              >
                Add First Artifact
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const isConfirmed = item.verificationStatus === 'EXCHANGE_CONFIRMED';
              const isEvidence = item.verificationStatus === 'PORTFOLIO_EVIDENCE';

              return (
                <div
                  key={item._id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isConfirmed
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60 shadow-sm'
                      : isEvidence
                      ? 'bg-indigo-50/20 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-800/60'
                      : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {/* Top Badges: Skill, Verification Tier, Visibility */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="teal">{item.skillName}</Badge>
                      <Badge variant="slate" className="text-[10px]">{item.itemType?.replace('_', ' ')}</Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.visibility === 'PRIVATE' && (
                        <span title="Private (only visible to you)" className="text-slate-400">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {item.visibility === 'MEMBERS_ONLY' && (
                        <span title="Visible to members only" className="text-slate-400">
                          <Users className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-1.5 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3 line-clamp-3">
                    {item.description}
                  </p>

                  {/* Auditable Proof Details */}
                  {isConfirmed && (
                    <div className="mb-3 p-2.5 bg-emerald-100/60 dark:bg-emerald-900/30 rounded-xl border border-emerald-300/80 dark:border-emerald-800/60 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Exchange-Confirmed Outcome:</strong>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                          Verified with peer: <strong>{item.peerReviewer?.name || 'Verified Partner'}</strong>
                          {item.linkedSession?.date && ` • ${new Date(item.linkedSession.date).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* External Evidence Link if Available */}
                  {item.evidenceUrl && (
                    <div className="mb-3">
                      <a
                        href={item.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Inspect Evidence Artifact</span>
                      </a>
                    </div>
                  )}

                  {/* Footer Bar: Verification Status Tag & Owner Actions */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                    <div>
                      {isConfirmed ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed by Peer Exchange
                        </span>
                      ) : isEvidence ? (
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <ExternalLink className="w-3.5 h-3.5" /> External Portfolio Evidence
                        </span>
                      ) : (
                        <span className="font-medium text-slate-400 dark:text-slate-500">Self-Reported Skill</span>
                      )}
                    </div>

                    {isOwner && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setIsItemModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit artifact"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item._id)}
                          className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Delete artifact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Item Create / Edit Modal */}
      <PortfolioItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        editingItem={editingItem}
        userSkills={userSkills}
      />

      {/* Auditable Exchange Confirmation Modal */}
      <ConfirmExchangeModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmExchange}
      />
    </Card>
  );
};

export default PortfolioSection;
