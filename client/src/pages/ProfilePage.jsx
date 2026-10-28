import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  User,
  Award,
  BookOpen,
  Mail,
  Clock,
  Calendar,
  Star,
  ShieldCheck,
  CheckCircle2,
  Edit3,
  AlertCircle,
  ShieldAlert,
  Trash2,
  ExternalLink,
  Flag,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import SkillSelector from '../components/ui/SkillSelector';
import PortfolioSection from '../components/portfolio/PortfolioSection';
import TrustProfileSection from '../components/trust/TrustProfileSection';
import SkillEvidenceModal from '../components/skills/SkillEvidenceModal';
import SkillEvidenceViewModal from '../components/skills/SkillEvidenceViewModal';
import ReportModal from '../components/reports/ReportModal';
import AchievementsList from '../components/challenges/AchievementsList';
import { useAuth } from '../context/AuthContext';
import { getPublicProfile, updateProfile } from '../services/userService';
import { getUserReviews, updateReview, deleteReview } from '../services/reviewService';
import { sendExchangeRequest, getPendingRequestStatus } from '../services/exchangeService';
import { getMyAchievements, getPublicAchievements } from '../services/challengeService';

export const ProfilePage = () => {
  const { id } = useParams();
  const { user: authUser, refreshUser } = useAuth();

  const isSelf = !id || id === authUser?._id;

  const [profileUser, setProfileUser] = useState(isSelf ? authUser : null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    bio: '',
    availability: 'flexible',
    experienceLevel: 'INTERMEDIATE',
    preferredLearningStyle: 'hands_on',
    skills: [],
    learningInterests: [],
  });
  const [updating, setUpdating] = useState(false);

  // V3.6 Skill Evidence States
  const [selectedSkillForEvidence, setSelectedSkillForEvidence] = useState(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [selectedSkillForView, setSelectedSkillForView] = useState(null);
  const [isEvidenceViewModalOpen, setIsEvidenceViewModalOpen] = useState(false);

  // V3.6 Reporting State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalTarget, setReportModalTarget] = useState({
    targetType: 'USER',
    targetId: '',
    reportedUserId: '',
    targetTitle: '',
  });

  // V3.6 Review Edit State
  const [editingReview, setEditingReview] = useState(null);
  const [isEditReviewModalOpen, setIsEditReviewModalOpen] = useState(false);
  const [editReviewForm, setEditReviewForm] = useState({ rating: 5, feedbackText: '' });
  const [savingReview, setSavingReview] = useState(false);
  const [editReviewError, setEditReviewError] = useState(null);

  // Direct Session Request State (V3.5.1)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [checkingPending, setCheckingPending] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [requestData, setRequestData] = useState({
    offeredSkill: '',
    requestedSkill: '',
    message: '',
  });

  const [achievementsData, setAchievementsData] = useState({
    achievements: [],
    unlockedCount: 0,
    totalCount: 6,
  });

  useEffect(() => {
    let isMounted = true;
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const targetId = isSelf ? authUser?._id : id;
        if (targetId) {
          const [profRes, revRes, achRes] = await Promise.all([
            getPublicProfile(targetId),
            getUserReviews(targetId),
            isSelf ? getMyAchievements().catch(() => null) : getPublicAchievements(targetId).catch(() => null),
          ]);
          if (isMounted) {
            if (profRes?.data?.user) setProfileUser(profRes.data.user);
            if (revRes?.data?.reviews) setReviews(revRes.data.reviews);
            if (achRes?.data) {
              setAchievementsData({
                achievements: achRes.data.achievements || [],
                unlockedCount: achRes.data.unlockedCount ?? (achRes.data.achievements || []).filter((a) => a.isUnlocked || a.unlockedAt).length,
                totalCount: achRes.data.totalCount || 6,
              });
            }
          }

          // If viewing another peer's profile, check if a pending session request already exists
          if (!isSelf && targetId && authUser?._id) {
            try {
              setCheckingPending(true);
              const pendingRes = await getPendingRequestStatus(targetId);
              if (isMounted && pendingRes?.data?.hasPendingRequest) {
                setHasPendingRequest(true);
              }
            } catch (pErr) {
              console.warn('[Pending Request Check]', pErr.message);
            } finally {
              if (isMounted) setCheckingPending(false);
            }
          }
        }
      } catch (e) {
        console.warn('[Profile Fetch Error]', e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfileData();
    return () => {
      isMounted = false;
    };
  }, [id, authUser, isSelf]);

  const handleOpenEdit = () => {
    if (!profileUser) return;
    setEditFormData({
      name: profileUser.name || '',
      bio: profileUser.bio || '',
      availability: profileUser.availability || 'flexible',
      experienceLevel: profileUser.experienceLevel || 'INTERMEDIATE',
      preferredLearningStyle: profileUser.preferredLearningStyle || 'hands_on',
      skills: profileUser.skills || [],
      learningInterests: profileUser.learningInterests || [],
    });
    setIsEditModalOpen(true);
  };

  const handleOpenRequestModal = () => {
    if (!profileUser) return;
    const peerTeachable = (profileUser.skills || []).filter(
      (s) => !s.type || s.type === 'TEACH' || s.type === 'both'
    );
    const myTeachable = (authUser?.skills || []).filter(
      (s) => !s.type || s.type === 'TEACH' || s.type === 'both'
    );

    setRequestData({
      requestedSkill: peerTeachable[0]?.name || 'Skill Mentorship',
      offeredSkill: myTeachable[0]?.name || 'Peer Knowledge Exchange',
      message: `Hi ${profileUser.name || 'there'}! I saw your profile on EnhanceUs and would love to organize a 1-on-1 skill exchange session with you.`,
    });
    setRequestError(null);
    setRequestSuccess(false);
    setIsRequestModalOpen(true);
  };

  const handleSendDirectRequest = async (e) => {
    e.preventDefault();
    if (!profileUser?._id) return;

    if (!requestData.message.trim()) {
      setRequestError('Please provide a message explaining your session exchange request.');
      return;
    }

    if (requestData.message.trim().length > 500) {
      setRequestError('Message cannot exceed 500 characters.');
      return;
    }

    setSendingRequest(true);
    setRequestError(null);

    try {
      await sendExchangeRequest({
        recipientId: profileUser._id,
        offeredSkill: requestData.offeredSkill.trim() || 'General Skill Exchange',
        requestedSkill: requestData.requestedSkill.trim() || 'Direct Mentorship Session',
        proposedExchange: requestData.message.trim(),
      });

      setRequestSuccess(true);
      setHasPendingRequest(true);

      setTimeout(() => {
        setIsRequestModalOpen(false);
        setRequestSuccess(false);
      }, 1600);
    } catch (err) {
      const errMsg =
        err?.response?.data?.message || err.message || 'Failed to send direct session request.';
      if (errMsg.toLowerCase().includes('already pending')) {
        setHasPendingRequest(true);
      }
      setRequestError(errMsg);
    } finally {
      setSendingRequest(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await updateProfile(editFormData);
      if (res?.data?.user) {
        setProfileUser(res.data.user);
        await refreshUser();
      }
      setIsEditModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleEvidenceUpdated = async () => {
    try {
      const targetId = isSelf ? authUser?._id : id;
      if (targetId) {
        const profRes = await getPublicProfile(targetId);
        if (profRes?.data?.user) setProfileUser(profRes.data.user);
      }
      await refreshUser();
    } catch (e) {
      console.warn('[Evidence Refresh Error]', e.message);
    }
  };

  const handleOpenReportUser = () => {
    if (!profileUser) return;
    setReportModalTarget({
      targetType: 'USER',
      targetId: profileUser._id,
      reportedUserId: profileUser._id,
      targetTitle: profileUser.name || 'User Profile',
    });
    setIsReportModalOpen(true);
  };

  const handleOpenReportReview = (rev) => {
    setReportModalTarget({
      targetType: 'REVIEW',
      targetId: rev._id,
      reportedUserId: rev.reviewer?._id || rev.reviewer,
      targetTitle: `Review by ${rev.reviewer?.name || 'Peer'}`,
    });
    setIsReportModalOpen(true);
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      const targetId = isSelf ? authUser?._id : id;
      if (targetId) {
        const profRes = await getPublicProfile(targetId);
        if (profRes?.data?.user) setProfileUser(profRes.data.user);
      }
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to delete review');
    }
  };

  const handleOpenEditReview = (rev) => {
    setEditingReview(rev);
    setEditReviewForm({
      rating: rev.overallRating || 5,
      feedbackText: rev.feedbackText || '',
    });
    setEditReviewError(null);
    setIsEditReviewModalOpen(true);
  };

  const handleSaveEditReview = async (e) => {
    e.preventDefault();
    if (!editingReview) return;
    setSavingReview(true);
    setEditReviewError(null);
    try {
      const res = await updateReview(editingReview._id, editReviewForm);
      const updated = res?.data?.data?.review || res?.data?.review || {
        ...editingReview,
        overallRating: Number(editReviewForm.rating),
        feedbackText: editReviewForm.feedbackText.trim(),
      };
      setReviews((prev) =>
        prev.map((r) => (r._id === editingReview._id ? { ...r, ...updated } : r))
      );
      setIsEditReviewModalOpen(false);
      const targetId = isSelf ? authUser?._id : id;
      if (targetId) {
        const profRes = await getPublicProfile(targetId);
        if (profRes?.data?.user) setProfileUser(profRes.data.user);
      }
    } catch (err) {
      setEditReviewError(err?.response?.data?.message || err.message || 'Failed to update review');
    } finally {
      setSavingReview(false);
    }
  };

  const userToDisplay = isSelf ? authUser : profileUser;
  const reputation = userToDisplay?.reputation || { averageRating: 5.0, reviewCount: 0 };

  return (
    <PageContainer
      title={isSelf ? 'Your Profile & Reputation Blueprint' : `${userToDisplay?.name || 'Peer'}'s Profile`}
      subtitle="Verified domain skills, teaching hours, and peer exchange ratings."
      action={
        isSelf ? (
          <Button variant="outline" size="sm" onClick={handleOpenEdit} leftIcon={Edit3}>
            Edit Profile & Skills
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenReportUser}
              leftIcon={ShieldAlert}
              className="text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 text-xs"
              title="Report profile for moderation review"
            >
              Report Profile
            </Button>
            {hasPendingRequest ? (
              <div className="flex items-center gap-2">
                <Badge variant="amber" icon={Clock} className="px-3 py-1.5 text-xs font-semibold">
                  Request Pending
                </Badge>
                <Button size="sm" variant="outline" disabled leftIcon={Calendar}>
                  Request Sent
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleOpenRequestModal}
                leftIcon={Calendar}
                className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
              >
                Request a Session
              </Button>
            )}
          </div>
        )
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Left Column: User Profile Details & Statistics */}
        <Card className="md:col-span-1 border-teal-200/80 dark:border-teal-900/40 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center font-extrabold text-2xl mb-4 border-4 border-white dark:border-slate-800 shadow-md">
              {userToDisplay?.name ? userToDisplay.name.charAt(0).toUpperCase() : 'U'}
            </div>
            
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">{userToDisplay?.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{userToDisplay?.email}</p>

            <div className="flex items-center gap-1.5 mb-4 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-bold">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{reputation.averageRating?.toFixed(1) || '5.0'} Rating ({reputation.reviewCount || 0} reviews)</span>
            </div>

            {userToDisplay?.bio && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-left w-full leading-relaxed mb-4">
                {userToDisplay.bio}
              </p>
            )}

            {/* Achievement Metrics */}
            <div className="w-full grid grid-cols-2 gap-2 text-left pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">HOURS TAUGHT</span>
                <span className="text-lg font-extrabold text-teal-600 dark:text-teal-400">{userToDisplay?.hoursTaught || 0} hrs</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">HOURS LEARNED</span>
                <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{userToDisplay?.hoursLearned || 0} hrs</span>
              </div>
            </div>

            {/* V3.6 Authoritative Trust Indicators */}
            <div className="w-full mt-3 p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-teal-100 dark:border-teal-900/40 text-left space-y-2">
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block">
                Verified Trust Indicators
              </span>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Completed Exchanges:
                </span>
                <strong className="text-slate-900 dark:text-slate-100 font-bold">
                  {userToDisplay?.sessionsCompleted || 0}
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Verified Skills:
                </span>
                <strong className="text-teal-600 dark:text-teal-400 font-bold">
                  {(userToDisplay?.skills || []).filter((s) => s.evidence?.verificationStatus === 'VERIFIED').length}
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Rating Record:
                </span>
                <strong className="text-slate-900 dark:text-slate-100 font-bold">
                  {reputation.reviewCount > 0 ? `${reputation.averageRating?.toFixed(1)}★ (${reputation.reviewCount})` : 'New Contributor'}
                </strong>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 w-full text-left space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Availability:</span>
                <strong className="text-slate-800 dark:text-slate-200 capitalize">{userToDisplay?.availability || 'Flexible'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Experience Level:</span>
                <strong className="text-slate-800 dark:text-slate-200 capitalize">{userToDisplay?.experienceLevel || 'Intermediate'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Learning Style:</span>
                <strong className="text-slate-800 dark:text-slate-200 capitalize">{(userToDisplay?.preferredLearningStyle || 'hands_on').replace('_', ' ')}</strong>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Column: Skills Matrix & Peer Reviews */}
        <div className="md:col-span-2 space-y-6">
          
          <Card>
            <CardHeader>
              <CardTitle>Skill Matrix & Domain Capabilities</CardTitle>
              <CardDescription>Verified teaching skills vs target growth learning interests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Skills Offered (Teaching)
                </h4>
                {userToDisplay?.skills && userToDisplay.skills.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {userToDisplay.skills.map((sk, idx) => {
                      const evStatus = sk.evidence?.verificationStatus || 'NOT_SUBMITTED';
                      const hasEvidence = sk.evidence && (sk.evidence.portfolioUrl || sk.evidence.certificateUrl || sk.evidence.workSampleUrl || sk.evidence.description);

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-2.5 text-xs shadow-sm hover:border-teal-300 dark:hover:border-teal-800 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm block">
                                {sk.name}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                {sk.category || 'General'} • {sk.level || 'INTERMEDIATE'}
                              </span>
                            </div>
                            {evStatus === 'VERIFIED' && (
                              <Badge variant="teal" icon={ShieldCheck} size="sm" className="font-bold shrink-0">
                                Verified
                              </Badge>
                            )}
                            {(evStatus === 'SUBMITTED' || evStatus === 'UNDER_REVIEW') && (
                              <Badge variant="amber" icon={Clock} size="sm" className="font-semibold shrink-0">
                                Under Review
                              </Badge>
                            )}
                            {evStatus === 'REJECTED' && (
                              <Badge variant="rose" icon={AlertCircle} size="sm" className="font-semibold shrink-0">
                                Rejected
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                            {isSelf ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSkillForEvidence(sk);
                                  setIsEvidenceModalOpen(true);
                                }}
                                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                              >
                                <span>{hasEvidence ? 'Manage Evidence' : '+ Add Evidence'}</span>
                              </button>
                            ) : hasEvidence ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSkillForView(sk);
                                  setIsEvidenceViewModalOpen(true);
                                }}
                                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1.5"
                              >
                                <span>View Evidence</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No external proof attached</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No teaching skills listed.</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Target Learning Interests
                </h4>
                {userToDisplay?.learningInterests && userToDisplay.learningInterests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userToDisplay.learningInterests.map((interest, idx) => (
                      <Badge key={idx} variant="indigo">
                        {interest.name} <span className="text-[10px] opacity-70">({interest.priority || 'HIGH'})</span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No learning interests listed.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Peer Reviews Card */}
          <Card>
            <CardHeader>
              <CardTitle>Verified Peer Reviews ({reviews.length})</CardTitle>
              <CardDescription>Ratings submitted by exchange partners following completed sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4 text-center">No peer reviews submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => {
                    const revAuthorId = rev.reviewer?._id || rev.reviewer;
                    const isReviewAuthor = revAuthorId && authUser?._id && (String(revAuthorId) === String(authUser._id));
                    return (
                      <div key={rev._id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{rev.reviewer?.name || 'Peer Learner'}</span>
                          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{rev.overallRating} / 5</span>
                          </div>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 italic mb-2">"{rev.feedbackText}"</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                          <span className="text-slate-400">
                            {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Verified Session'}
                          </span>
                          <div className="flex items-center gap-2">
                            {isReviewAuthor ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditReview(rev)}
                                  className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReview(rev._id)}
                                  className="text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenReportReview(rev)}
                                className="text-slate-400 hover:text-rose-500 font-medium flex items-center gap-1"
                                title="Report this review"
                              >
                                <Flag className="w-3 h-3" />
                                <span>Report</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* V3.2 Auditable Trust & Contribution Standing Section */}
      <div className="mb-8">
        <TrustProfileSection
          targetUserId={userToDisplay?._id}
          isOwner={isSelf}
        />
      </div>

      {/* Proof-of-Skill Portfolio Matrix */}
      <div className="mb-8">
        <PortfolioSection
          targetUserId={userToDisplay?._id}
          isOwner={isSelf}
          userSkills={userToDisplay?.skills || []}
        />
      </div>

      {/* V3.8 Community Challenge Achievements */}
      <div className="mb-8">
        <AchievementsList
          achievements={achievementsData.achievements}
          unlockedCount={achievementsData.unlockedCount}
          totalCount={achievementsData.totalCount}
        />
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile & Skill Matrix"
        description="Update your bio, availability, experience level, and skill taxonomy."
        className="max-w-2xl"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <Input
            label="Full Name"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Bio</label>
            <textarea
              rows={3}
              value={editFormData.bio}
              onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Experience Level</label>
              <select
                value={editFormData.experienceLevel}
                onChange={(e) => setEditFormData({ ...editFormData, experienceLevel: e.target.value })}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Preferred Learning Style</label>
              <select
                value={editFormData.preferredLearningStyle}
                onChange={(e) => setEditFormData({ ...editFormData, preferredLearningStyle: e.target.value })}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="hands_on">Hands-On Projects</option>
                <option value="visual">Visual & Architecture Diagrams</option>
                <option value="reading_writing">Reading & Documentation</option>
                <option value="collaborative">Pair Programming / Exchange</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">Skills You Offer To Teach</label>
            <SkillSelector
              value={editFormData.skills}
              onChange={(skills) => setEditFormData({ ...editFormData, skills })}
              mode="TEACH"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={updating}>Save Profile Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Direct Session Request Modal (V3.5.1) */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => !sendingRequest && setIsRequestModalOpen(false)}
        title={`Request a Session with ${profileUser?.name || 'Peer'}`}
      >
        <form onSubmit={handleSendDirectRequest} className="space-y-4 text-xs">
          {/* Peer Context Pill */}
          <div className="p-3 bg-teal-50/60 dark:bg-teal-950/40 rounded-xl border border-teal-200/80 dark:border-teal-800/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {profileUser?.name ? profileUser.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">{profileUser?.name}</p>
              <p className="text-[11px] text-teal-700 dark:text-teal-300">
                {profileUser?.skills?.length
                  ? `Teaches: ${profileUser.skills.map((s) => s.name).join(', ')}`
                  : 'Open to Peer Skill Exchange'}
              </p>
            </div>
          </div>

          {requestSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Session request sent successfully! Peer notified in Exchange Requests.</span>
            </div>
          )}

          {requestError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{requestError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Skill You Want To Learn</label>
              <input
                type="text"
                value={requestData.requestedSkill}
                onChange={(e) => setRequestData({ ...requestData, requestedSkill: e.target.value })}
                placeholder="e.g. React, UI/UX Design"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Skill You Can Offer In Return</label>
              <input
                type="text"
                value={requestData.offeredSkill}
                onChange={(e) => setRequestData({ ...requestData, offeredSkill: e.target.value })}
                placeholder="e.g. Node.js, TypeScript"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Custom Request Message</label>
              <span className={`text-[10px] ${requestData.message.length > 500 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                {requestData.message.length} / 500
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={500}
              value={requestData.message}
              onChange={(e) => setRequestData({ ...requestData, message: e.target.value })}
              placeholder="Introduce yourself and explain what you'd like to collaborate on..."
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
              required
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            ℹ This request will appear in {profileUser?.name || 'this peer'}'s <strong>Exchange Requests</strong> tab. Only one pending request may be active at a time.
          </p>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsRequestModalOpen(false)}
              disabled={sendingRequest}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={sendingRequest}
              disabled={sendingRequest || requestSuccess || !requestData.message.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Send Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* V3.6 Skill Evidence Management Modal */}
      <SkillEvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        skill={selectedSkillForEvidence}
        onUpdated={handleEvidenceUpdated}
      />

      {/* V3.6 Skill Evidence View Modal */}
      <SkillEvidenceViewModal
        isOpen={isEvidenceViewModalOpen}
        onClose={() => setIsEvidenceViewModalOpen(false)}
        skill={selectedSkillForView}
        peerName={userToDisplay?.name}
      />

      {/* V3.6 Moderation Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetType={reportModalTarget.targetType}
        targetId={reportModalTarget.targetId}
        reportedUserId={reportModalTarget.reportedUserId}
        targetTitle={reportModalTarget.targetTitle}
      />

      {/* V3.6 Edit Review Modal */}
      <Modal
        isOpen={isEditReviewModalOpen}
        onClose={() => setIsEditReviewModalOpen(false)}
        title="Edit Session Review"
        description="Update your rating and feedback for this completed exchange session."
      >
        <form onSubmit={handleSaveEditReview} className="space-y-4 text-xs">
          {editReviewError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{editReviewError}</span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Overall Rating (1 - 5 Stars)</label>
            <select
              value={editReviewForm.rating}
              onChange={(e) => setEditReviewForm({ ...editReviewForm, rating: Number(e.target.value) })}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value={5}>⭐⭐⭐⭐⭐ (5 - Exceptional Mentor)</option>
              <option value={4}>⭐⭐⭐⭐ (4 - Very Good)</option>
              <option value={3}>⭐⭐⭐ (3 - Satisfactory)</option>
              <option value={2}>⭐⭐ (2 - Needs Improvement)</option>
              <option value={1}>⭐ (1 - Unsatisfactory)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Feedback Commentary</label>
            <textarea
              rows={4}
              maxLength={1000}
              value={editReviewForm.feedbackText}
              onChange={(e) => setEditReviewForm({ ...editReviewForm, feedbackText: e.target.value })}
              placeholder="Describe your peer mentorship experience..."
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
              required
            />
            <span className="text-[10px] text-slate-400 text-right">
              {editReviewForm.feedbackText.length} / 1000 characters
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEditReviewModalOpen(false)}
              disabled={savingReview}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={savingReview}
              disabled={savingReview || !editReviewForm.feedbackText.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Update Review
            </Button>
          </div>
        </form>
      </Modal>

    </PageContainer>
  );
};

export default ProfilePage;
