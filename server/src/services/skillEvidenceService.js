import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';
import { recordAuditLog } from './auditService.js';
import { ApiError } from '../utils/apiError.js';
import { normalizeSkillName } from '../utils/skillNormalizer.js';

export const validateHttpUrl = (urlStr, fieldName = 'URL') => {
  if (!urlStr || typeof urlStr !== 'string') return '';
  const trimmed = urlStr.trim();
  if (trimmed.length === 0) return '';
  if (trimmed.length > 500) {
    throw new ApiError(400, `${fieldName} cannot exceed 500 characters`);
  }
  if (!/^https?:\/\/.+/i.test(trimmed)) {
    throw new ApiError(400, `${fieldName} must use a valid HTTP or HTTPS web address`);
  }
  return trimmed;
};

/**
 * Associates or updates optional evidence for a user's own skill.
 * Strictly enforces that user-submitted evidence is set to SUBMITTED and never automatically VERIFIED.
 */
export const addOrUpdateSkillEvidence = async (userId, skillIdentifier, evidenceData) => {
  if (!userId) throw new ApiError(401, 'Authentication required');
  if (!skillIdentifier) throw new ApiError(400, 'Skill name or ID is required');

  const { portfolioUrl, certificateUrl, workSampleUrl, description } = evidenceData || {};

  const cleanPortfolioUrl = validateHttpUrl(portfolioUrl, 'Portfolio URL');
  const cleanCertificateUrl = validateHttpUrl(certificateUrl, 'Certificate URL');
  const cleanWorkSampleUrl = validateHttpUrl(workSampleUrl, 'Work sample URL');
  const cleanDescription = (description || '').trim();

  if (cleanDescription.length > 1000) {
    throw new ApiError(400, 'Experience description cannot exceed 1000 characters');
  }

  const hasAnyEvidence =
    cleanPortfolioUrl || cleanCertificateUrl || cleanWorkSampleUrl || cleanDescription;

  if (!hasAnyEvidence) {
    throw new ApiError(400, 'Please provide at least one portfolio link, certificate link, work sample link, or description');
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const normTarget = normalizeSkillName(skillIdentifier);
  const skill = (user.skills || []).find(
    (s) =>
      (s._id && s._id.toString() === skillIdentifier.toString()) ||
      normalizeSkillName(s.name) === normTarget
  );

  if (!skill) {
    throw new ApiError(404, `Skill "${skillIdentifier}" not found on your profile`);
  }

  // Update evidence subdocument
  skill.evidence = {
    portfolioUrl: cleanPortfolioUrl,
    certificateUrl: cleanCertificateUrl,
    workSampleUrl: cleanWorkSampleUrl,
    description: cleanDescription,
    // Strictly SUBMITTED: Never trust client input to set VERIFIED
    verificationStatus: 'SUBMITTED',
    submittedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    reviewerNotes: '',
    rejectionReason: '',
  };

  user.markModified('skills');
  await user.save();

  return {
    skillName: skill.name,
    skillId: skill._id,
    evidence: skill.evidence,
  };
};

/**
 * Removes evidence associated with a user's skill, resetting verification status to NOT_SUBMITTED.
 */
export const deleteSkillEvidence = async (userId, skillIdentifier) => {
  if (!userId) throw new ApiError(401, 'Authentication required');
  if (!skillIdentifier) throw new ApiError(400, 'Skill name or ID is required');

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const normTarget = normalizeSkillName(skillIdentifier);
  const skill = (user.skills || []).find(
    (s) =>
      (s._id && s._id.toString() === skillIdentifier.toString()) ||
      normalizeSkillName(s.name) === normTarget
  );

  if (!skill) {
    throw new ApiError(404, `Skill "${skillIdentifier}" not found on your profile`);
  }

  skill.evidence = {
    portfolioUrl: '',
    certificateUrl: '',
    workSampleUrl: '',
    description: '',
    verificationStatus: 'NOT_SUBMITTED',
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewerNotes: '',
    rejectionReason: '',
  };

  user.markModified('skills');
  await user.save();

  return {
    skillName: skill.name,
    skillId: skill._id,
    evidence: skill.evidence,
  };
};

/**
 * Retrieves the verification queue for authorized administrators.
 */
export const getAdminEvidenceQueue = async (filters = {}) => {
  const { status, skillName } = filters;
  const statusFilter = status ? [status] : ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'];

  const query = {
    'skills.evidence.verificationStatus': { $in: statusFilter },
    isDemo: { $ne: true }, // Filter demo users from production review queue
  };

  const users = await User.find(query).select('name email skills createdAt').lean();

  const queue = [];
  users.forEach((u) => {
    (u.skills || []).forEach((sk) => {
      const ev = sk.evidence;
      if (ev && statusFilter.includes(ev.verificationStatus)) {
        if (!skillName || normalizeSkillName(sk.name).includes(normalizeSkillName(skillName))) {
          queue.push({
            userId: u._id,
            userName: u.name,
            userEmail: u.email,
            skillId: sk._id,
            skillName: sk.name,
            skillCategory: sk.category || 'General',
            skillLevel: sk.level || 'INTERMEDIATE',
            skillType: sk.type || 'TEACH',
            evidence: ev,
            submittedAt: ev.submittedAt,
            reviewedAt: ev.reviewedAt,
            verificationStatus: ev.verificationStatus,
          });
        }
      }
    });
  });

  // Sort queue by most recently submitted
  queue.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  return queue;
};

/**
 * Authorized moderation of submitted skill evidence.
 * Decisions can only be made by authenticated administrators.
 */
export const moderateSkillEvidence = async (adminUser, targetUserId, skillIdentifier, decision) => {
  if (!adminUser) throw new ApiError(401, 'Admin authorization required');
  if (!targetUserId) throw new ApiError(400, 'Target user ID is required');
  if (!skillIdentifier) throw new ApiError(400, 'Skill name or ID is required');

  const { action, reviewerNotes, rejectionReason } = decision || {};
  const validActions = ['VERIFY', 'REJECT', 'UNDER_REVIEW'];
  if (!validActions.includes(action)) {
    throw new ApiError(400, `Action must be one of: ${validActions.join(', ')}`);
  }

  const user = await User.findById(targetUserId);
  if (!user) throw new ApiError(404, 'Target user not found');

  const normTarget = normalizeSkillName(skillIdentifier);
  const skill = (user.skills || []).find(
    (s) =>
      (s._id && s._id.toString() === skillIdentifier.toString()) ||
      normalizeSkillName(s.name) === normTarget
  );

  if (!skill) {
    throw new ApiError(404, `Skill "${skillIdentifier}" not found on target user profile`);
  }

  if (!skill.evidence || skill.evidence.verificationStatus === 'NOT_SUBMITTED') {
    throw new ApiError(400, 'No evidence has been submitted for this skill');
  }

  const prevStatus = skill.evidence.verificationStatus;
  const cleanNotes = (reviewerNotes || '').trim();
  const cleanRejection = (rejectionReason || '').trim();

  if (action === 'VERIFY') {
    skill.evidence.verificationStatus = 'VERIFIED';
    skill.evidence.reviewedBy = adminUser._id;
    skill.evidence.reviewedAt = new Date();
    skill.evidence.reviewerNotes = cleanNotes;
    skill.evidence.rejectionReason = '';
  } else if (action === 'REJECT') {
    skill.evidence.verificationStatus = 'REJECTED';
    skill.evidence.reviewedBy = adminUser._id;
    skill.evidence.reviewedAt = new Date();
    skill.evidence.reviewerNotes = cleanNotes;
    skill.evidence.rejectionReason = cleanRejection || cleanNotes || 'Evidence did not meet verification standards';
  } else if (action === 'UNDER_REVIEW') {
    skill.evidence.verificationStatus = 'UNDER_REVIEW';
    skill.evidence.reviewerNotes = cleanNotes;
  }

  user.markModified('skills');
  await user.save();

  // Record audit log
  await recordAuditLog({
    actor: adminUser,
    action: `SKILL_EVIDENCE_${action}`,
    targetId: `${targetUserId}:${skill.name}`,
    targetType: 'SKILL_EVIDENCE',
    details: {
      targetUserId,
      skillName: skill.name,
      previousStatus: prevStatus,
      newStatus: skill.evidence.verificationStatus,
      notes: cleanNotes,
      rejectionReason: skill.evidence.rejectionReason,
    },
  }).catch((err) => console.warn('[Audit Log Error]', err.message));

  // Send in-app notification to the skill owner
  try {
    const isApproved = action === 'VERIFY';
    await Notification.create({
      recipient: targetUserId,
      sender: adminUser._id,
      type: 'ANNOUNCEMENT',
      title: isApproved ? 'Skill Evidence Verified!' : 'Skill Evidence Update',
      message: isApproved
        ? `Your evidence for "${skill.name}" has been verified by platform moderators!`
        : `Your evidence for "${skill.name}" review status has been updated to ${skill.evidence.verificationStatus}.`,
      link: '/profile',
    });
  } catch (notifErr) {
    console.warn('[Notification Error]', notifErr.message);
  }

  return {
    skillName: skill.name,
    skillId: skill._id,
    evidence: skill.evidence,
  };
};

export default {
  validateHttpUrl,
  addOrUpdateSkillEvidence,
  deleteSkillEvidence,
  getAdminEvidenceQueue,
  moderateSkillEvidence,
};
