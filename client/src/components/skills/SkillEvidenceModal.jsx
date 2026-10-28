import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, Trash2, ExternalLink, Info, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { submitSkillEvidence, deleteSkillEvidence } from '../../services/skillEvidenceService';

export const SkillEvidenceModal = ({ isOpen, onClose, skill, onUpdated }) => {
  const [formData, setFormData] = useState({
    portfolioUrl: '',
    certificateUrl: '',
    workSampleUrl: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const existingEvidence = skill?.evidence;
  const status = existingEvidence?.verificationStatus || 'NOT_SUBMITTED';

  useEffect(() => {
    if (skill) {
      setFormData({
        portfolioUrl: existingEvidence?.portfolioUrl || '',
        certificateUrl: existingEvidence?.certificateUrl || '',
        workSampleUrl: existingEvidence?.workSampleUrl || '',
        description: existingEvidence?.description || '',
      });
      setError(null);
      setSuccessMsg(null);
    }
  }, [skill, isOpen]);

  if (!skill) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const hasAny =
      formData.portfolioUrl.trim() ||
      formData.certificateUrl.trim() ||
      formData.workSampleUrl.trim() ||
      formData.description.trim();

    if (!hasAny) {
      setError('Please provide at least one evidence URL or a short experience description.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitSkillEvidence(skill.name, formData);
      setSuccessMsg('Skill evidence submitted for platform review!');
      if (onUpdated) onUpdated(res);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to submit evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove all evidence for "${skill.name}"?`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await deleteSkillEvidence(skill.name);
      setSuccessMsg('Evidence removed successfully.');
      if (onUpdated) onUpdated(res);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to delete evidence.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Skill Evidence: ${skill.name}`}
      description="Attach verifiable proof of experience or credentials. Evidence is reviewed by platform moderators."
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Status Indicator */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Verification Status:</span>
          <div>
            {status === 'VERIFIED' && (
              <Badge variant="teal" icon={ShieldCheck} className="font-bold">
                Platform Verified
              </Badge>
            )}
            {status === 'SUBMITTED' && (
              <Badge variant="amber" icon={Info} className="font-bold">
                Submitted (Pending Review)
              </Badge>
            )}
            {status === 'UNDER_REVIEW' && (
              <Badge variant="indigo" icon={Info} className="font-bold">
                Under Active Review
              </Badge>
            )}
            {status === 'REJECTED' && (
              <Badge variant="rose" icon={AlertCircle} className="font-bold">
                Review Rejected
              </Badge>
            )}
            {status === 'NOT_SUBMITTED' && (
              <Badge variant="neutral" className="font-bold">
                No Evidence Submitted
              </Badge>
            )}
          </div>
        </div>

        {/* Rejection notice if previously rejected */}
        {status === 'REJECTED' && existingEvidence?.rejectionReason && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div>
              <strong className="block font-bold">Reviewer Note:</strong>
              <p className="mt-0.5 leading-relaxed">{existingEvidence.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Informational Policy Banner */}
        <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-900/40 rounded-xl text-teal-800 dark:text-teal-300 flex items-start gap-2 leading-relaxed">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
          <p>
            Submitting evidence does not guarantee verification. All portfolio URLs and credentials are independently inspected by authorized platform reviewers before receiving a verified indicator.
          </p>
        </div>

        <Input
          label="Portfolio / Project URL"
          placeholder="https://github.com/username/project or personal site"
          value={formData.portfolioUrl}
          onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
        />

        <Input
          label="Certificate / Credential Verification URL"
          placeholder="https://credentials.issuer.org/verify/..."
          value={formData.certificateUrl}
          onChange={(e) => setFormData({ ...formData, certificateUrl: e.target.value })}
        />

        <Input
          label="Live Work Sample URL"
          placeholder="https://deployed-app.com, design showcase, or published paper"
          value={formData.workSampleUrl}
          onChange={(e) => setFormData({ ...formData, workSampleUrl: e.target.value })}
        />

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Experience Summary & Role
            </label>
            <span className="text-[10px] text-slate-400">
              {formData.description.length}/1000
            </span>
          </div>
          <textarea
            rows={3}
            maxLength={1000}
            placeholder="Briefly describe how you have applied this skill in real-world projects or professional work..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          {status !== 'NOT_SUBMITTED' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting || submitting}
              className="text-rose-600 hover:text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
              leftIcon={Trash2}
            >
              {deleting ? 'Removing...' : 'Remove Evidence'}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default SkillEvidenceModal;
