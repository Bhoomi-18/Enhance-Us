import React from 'react';
import { ShieldCheck, ExternalLink, Calendar, User, FileText, AlertCircle, Clock } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export const SkillEvidenceViewModal = ({ isOpen, onClose, skill, peerName }) => {
  if (!skill) return null;

  const ev = skill.evidence;
  const status = ev?.verificationStatus || 'NOT_SUBMITTED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Skill Verification Details: ${skill.name}`}
      description={`Domain credentials and practical work evidence provided by ${peerName || 'user'}.`}
      className="max-w-xl"
    >
      <div className="space-y-5 text-xs">
        {/* Verification Status Header Banner */}
        {status === 'VERIFIED' && (
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <strong className="text-sm font-extrabold">Platform-Reviewed & Verified Skill</strong>
            </div>
            <p className="text-xs leading-relaxed text-teal-800 dark:text-teal-300">
              An authorized EnhanceUs platform administrator reviewed the portfolio projects and certificate links submitted for this skill.
            </p>
            {ev?.reviewerNotes && (
              <div className="pt-2 border-t border-teal-200/60 dark:border-teal-800/60 text-[11px] italic">
                "{ev.reviewerNotes}"
              </div>
            )}
          </div>
        )}

        {(status === 'SUBMITTED' || status === 'UNDER_REVIEW') && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <strong className="text-sm font-bold">Evidence Submitted (Under Review)</strong>
            </div>
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              The user has provided links and experience details for this skill. This evidence is currently awaiting manual review by platform moderators and is not yet verified.
            </p>
          </div>
        )}

        {status === 'NOT_SUBMITTED' && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-center py-6">
            <p className="text-xs italic">No external credentials or portfolio evidence have been submitted for this skill yet.</p>
          </div>
        )}

        {/* Evidence Artifacts Display */}
        {ev && (ev.portfolioUrl || ev.certificateUrl || ev.workSampleUrl || ev.description) && (
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              Submitted Artifacts
            </h4>

            {ev.portfolioUrl && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Portfolio / Repository Project</span>
                  <span className="text-[11px] text-slate-500 font-mono truncate max-w-xs block">{ev.portfolioUrl}</span>
                </div>
                <a
                  href={ev.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:border-teal-500 rounded-lg text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>Visit Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {ev.certificateUrl && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Credential / Certificate URL</span>
                  <span className="text-[11px] text-slate-500 font-mono truncate max-w-xs block">{ev.certificateUrl}</span>
                </div>
                <a
                  href={ev.certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:border-teal-500 rounded-lg text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>Verify Credential</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {ev.workSampleUrl && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Live Work Sample / Demo</span>
                  <span className="text-[11px] text-slate-500 font-mono truncate max-w-xs block">{ev.workSampleUrl}</span>
                </div>
                <a
                  href={ev.workSampleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:border-teal-500 rounded-lg text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>View Sample</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {ev.description && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Experience Description</span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{ev.description}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SkillEvidenceViewModal;
