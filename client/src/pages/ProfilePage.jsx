import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Award, BookOpen, Mail, Clock, Calendar, Star, ShieldCheck, CheckCircle2, Edit3 } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import SkillSelector from '../components/ui/SkillSelector';
import PortfolioSection from '../components/portfolio/PortfolioSection';
import { useAuth } from '../context/AuthContext';
import { getPublicProfile, updateProfile } from '../services/userService';
import { getUserReviews } from '../services/reviewService';

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

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const targetId = isSelf ? authUser?._id : id;
        if (targetId) {
          const [profRes, revRes] = await Promise.all([
            getPublicProfile(targetId),
            getUserReviews(targetId),
          ]);
          if (profRes?.data?.user) setProfileUser(profRes.data.user);
          if (revRes?.data?.reviews) setReviews(revRes.data.reviews);
        }
      } catch (e) {
        console.warn('[Profile Fetch Error]', e.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
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

  const userToDisplay = isSelf ? authUser : profileUser;
  const reputation = userToDisplay?.reputation || { averageRating: 5.0, reviewCount: 0 };

  return (
    <PageContainer
      title={isSelf ? 'Your Profile & Reputation Blueprint' : `${userToDisplay?.name || 'Peer'}'s Profile`}
      subtitle="Verified domain skills, teaching hours, and peer exchange ratings."
      action={
        isSelf && (
          <Button variant="outline" size="sm" onClick={handleOpenEdit} leftIcon={Edit3}>
            Edit Profile & Skills
          </Button>
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
                  <div className="flex flex-wrap gap-2">
                    {userToDisplay.skills.map((sk, idx) => (
                      <Badge key={idx} variant="teal">
                        {sk.name} <span className="text-[10px] opacity-70">({sk.level || 'INTERMEDIATE'})</span>
                      </Badge>
                    ))}
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
                  {reviews.map((rev) => (
                    <div key={rev._id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{rev.reviewer?.name || 'Peer Learner'}</span>
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{rev.overallRating} / 5</span>
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 italic">"{rev.feedbackText}"</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Proof-of-Skill Portfolio Matrix */}
      <div className="mb-8">
        <PortfolioSection
          targetUserId={userToDisplay?._id}
          isOwner={isSelf}
          userSkills={userToDisplay?.skills || []}
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

    </PageContainer>
  );
};

export default ProfilePage;
