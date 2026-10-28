import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  User,
  Shield,
  MessageSquare,
  Search,
  ExternalLink,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import { getAdminReports, moderateReport } from '../../services/reportService';

export const AdminReportsTab = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Moderation Modal State
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modData, setModData] = useState({
    status: 'INVESTIGATING',
    actionTaken: 'NONE',
    moderationNotes: '',
  });
  const [submittingMod, setSubmittingMod] = useState(false);
  const [modError, setModError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (statusFilter !== 'ALL') filters.status = statusFilter;
      const res = await getAdminReports(filters);
      setReports(res?.data?.reports || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const handleOpenModeration = (report) => {
    setSelectedReport(report);
    setModData({
      status: report.status === 'PENDING' ? 'INVESTIGATING' : report.status,
      actionTaken: report.actionTaken || 'NONE',
      moderationNotes: report.moderationNotes || '',
    });
    setModError(null);
    setIsModalOpen(true);
  };

  const handleSaveModeration = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    setSubmittingMod(true);
    setModError(null);
    try {
      await moderateReport(selectedReport._id, modData);
      setIsModalOpen(false);
      await fetchReports();
    } catch (err) {
      setModError(err?.response?.data?.message || err.message || 'Failed to update report.');
    } finally {
      setSubmittingMod(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.reason?.toLowerCase().includes(term) ||
      r.reportedUser?.name?.toLowerCase().includes(term) ||
      r.reportedUser?.email?.toLowerCase().includes(term) ||
      r.category?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <CardTitle>User Abuse & Content Moderation Reports</CardTitle>
            </div>
            <CardDescription>
              Review flagged profiles, suspicious skills, and user conduct issues.
            </CardDescription>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl text-xs font-semibold">
            {['ALL', 'PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter reports by user name, email, category, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-xs text-slate-400">
              <LoadingSpinner size="sm" />
              <span>Loading moderation reports...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No reports found matching the selected criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => (
                <div
                  key={report._id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          report.status === 'PENDING'
                            ? 'rose'
                            : report.status === 'INVESTIGATING'
                            ? 'amber'
                            : report.status === 'RESOLVED'
                            ? 'teal'
                            : 'neutral'
                        }
                      >
                        {report.status}
                      </Badge>
                      <Badge variant="indigo" className="font-mono text-[10px]">
                        {report.category}
                      </Badge>
                      <span className="text-slate-400 text-[11px]">
                        Target: <strong className="text-slate-700 dark:text-slate-300">{report.targetType}</strong> ({report.targetId})
                      </span>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      "{report.reason}"
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                      <span>
                        Reported User:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {report.reportedUser?.name || 'Unknown'} ({report.reportedUser?.email})
                        </strong>
                      </span>
                      <span>
                        Reporter:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {report.reporter?.name || 'User'}
                        </strong>
                      </span>
                      <span>
                        Date: {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {report.moderationNotes && (
                      <div className="p-2.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/40 text-teal-800 dark:text-teal-300 text-[11px]">
                        <span className="font-bold">Moderator Notes:</span> {report.moderationNotes}
                        {report.actionTaken && report.actionTaken !== 'NONE' && (
                          <span className="ml-2 font-semibold">({report.actionTaken})</span>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenModeration(report)}
                    className="self-start text-xs font-bold shrink-0"
                  >
                    Moderate Report
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Moderation Decision Modal */}
      {selectedReport && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Moderate User Report"
          description={`Report #${selectedReport._id} against ${selectedReport.reportedUser?.name || 'User'}`}
          className="max-w-lg"
        >
          <form onSubmit={handleSaveModeration} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">Reported Reason:</span>
              <p className="text-slate-600 dark:text-slate-400 italic">"{selectedReport.reason}"</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">Review Status</label>
                <select
                  value={modData.status}
                  onChange={(e) => setModData({ ...modData, status: e.target.value })}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="INVESTIGATING">INVESTIGATING</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="DISMISSED">DISMISSED</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">Enforcement Action</label>
                <select
                  value={modData.actionTaken}
                  onChange={(e) => setModData({ ...modData, actionTaken: e.target.value })}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                >
                  <option value="NONE">NONE</option>
                  <option value="WARNING_ISSUED">WARNING_ISSUED</option>
                  <option value="CONTENT_REMOVED">CONTENT_REMOVED</option>
                  <option value="EVIDENCE_REJECTED">EVIDENCE_REJECTED</option>
                  <option value="USER_SUSPENDED">USER_SUSPENDED (Account Ban)</option>
                  <option value="DISMISSED">DISMISSED</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-800 dark:text-slate-200">
                Moderator Decision Notes & Audit Rationale
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                required
                placeholder="Document your findings, decision rationale, or communication with the user..."
                value={modData.moderationNotes}
                onChange={(e) => setModData({ ...modData, moderationNotes: e.target.value })}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {modError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                {modError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submittingMod} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                {submittingMod ? 'Recording...' : 'Save Decision'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminReportsTab;
