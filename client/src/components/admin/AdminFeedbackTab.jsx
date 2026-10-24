import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  Plus,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  User,
} from 'lucide-react';
import {
  getAdminFeedback,
  updateFeedbackStatus,
  addFeedbackNote,
  importFeedbackCsv,
} from '../../services/adminService';
import LoadingSpinner from '../ui/LoadingSpinner';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export const AdminFeedbackTab = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // CSV Import Modal
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState('');

  const fetchFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminFeedback({
        page,
        limit,
        status: statusFilter,
        rating: ratingFilter,
        search,
      });
      setFeedbackList(res?.data?.feedback || []);
      setTotal(res?.data?.total || 0);
      setPages(res?.data?.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load feedback inbox.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [page, statusFilter, ratingFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchFeedback();
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedFeedback) return;
    setStatusUpdating(true);
    try {
      const res = await updateFeedbackStatus(selectedFeedback._id, newStatus);
      setSelectedFeedback((prev) => ({ ...prev, status: newStatus }));
      fetchFeedback();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update feedback status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedFeedback) return;

    setNoteLoading(true);
    try {
      const res = await addFeedbackNote(selectedFeedback._id, newNote.trim());
      setSelectedFeedback((prev) => ({
        ...prev,
        adminNotes: res?.data?.adminNotes || [
          ...(prev.adminNotes || []),
          { note: newNote.trim(), adminEmail: 'You', createdAt: new Date() },
        ],
      }));
      setNewNote('');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to add note.');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvContent.trim()) {
      setCsvError('Please paste or upload valid CSV text.');
      return;
    }

    setCsvLoading(true);
    setCsvError('');
    setCsvResult(null);
    try {
      const res = await importFeedbackCsv(csvContent);
      setCsvResult(res?.data || { importedCount: 0 });
      fetchFeedback();
    } catch (err) {
      setCsvError(err.response?.data?.message || err.message || 'Failed to import CSV.');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleCsvFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target.result || '');
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls and Stats */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Platform Feedback Inbox
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing <strong>{feedbackList.length}</strong> of <strong>{total}</strong> submissions
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCsvModalOpen(true);
              setCsvResult(null);
              setCsvError('');
            }}
            className="gap-2 text-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Import Google Forms CSV
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search feedback text, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </form>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New (Unreviewed)</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Ratings (1-5 Stars)</option>
            <option value="5">5 Stars ★★★★★</option>
            <option value="4">4 Stars ★★★★☆</option>
            <option value="3">3 Stars ★★★☆☆</option>
            <option value="2">2 Stars ★★☆☆☆</option>
            <option value="1">1 Star ★☆☆☆☆</option>
          </select>
        </div>
      </div>

      {/* Feedback Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <LoadingSpinner size="lg" label="Loading Feedback..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 dark:text-rose-400 font-semibold">
            {error}
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs">No feedback records matched the filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Feedback Preview</th>
                  <th className="py-3 px-4">Author / Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Email Sent</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {feedbackList.map((item) => {
                  const rating = item.rating || 5;
                  const author = item.user?.email || item.submittedEmail || 'Anonymous';
                  const summaryText =
                    item.improvements || item.newFeatures || item.comments || 'No description provided';

                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedFeedback(item)}
                    >
                      {/* Rating */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-extrabold text-amber-500 flex items-center gap-1 font-mono">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          {rating} / 5
                        </span>
                      </td>

                      {/* Preview Text */}
                      <td className="py-3 px-4 max-w-xs truncate">
                        <span className="text-slate-800 dark:text-slate-200">{summaryText}</span>
                        {item.adminNotes && item.adminNotes.length > 0 && (
                          <span className="ml-2 inline-block px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {item.adminNotes.length} notes
                          </span>
                        )}
                      </td>

                      {/* Author */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {author}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'RESOLVED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : item.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : item.status === 'REVIEWED'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {item.status || 'NEW'}
                        </span>
                      </td>

                      {/* Email Delivered Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.emailDeliveryStatus === 'ACCEPTED' || (item.emailDelivered && !item.emailDeliveryStatus) ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> Accepted (Plunk)
                          </span>
                        ) : item.emailDeliveryStatus === 'SIMULATED' ? (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3" /> Simulated
                          </span>
                        ) : item.emailDeliveryStatus === 'FAILED' ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 text-[11px]">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFeedback(item);
                          }}
                          className="text-xs text-teal-600 hover:text-teal-700"
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Page <strong>{page}</strong> of <strong>{pages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="gap-1 px-2.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="gap-1 px-2.5"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Detail & Notes Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  Feedback Review
                </span>
                <span className="font-mono text-xs text-amber-500 font-bold">
                  ★ {selectedFeedback.rating} / 5
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Workflow status control */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Workflow Status:
              </span>
              <div className="flex items-center gap-1.5">
                {['NEW', 'REVIEWED', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={statusUpdating}
                    onClick={() => handleStatusChange(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      selectedFeedback.status === st
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Full text fields */}
            <div className="space-y-3 text-xs">
              {selectedFeedback.improvements && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    1. Suggested Improvements
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {selectedFeedback.improvements}
                  </p>
                </div>
              )}

              {selectedFeedback.newFeatures && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    2. Feature Requests
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {selectedFeedback.newFeatures}
                  </p>
                </div>
              )}

              {selectedFeedback.comments && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    3. Additional Comments
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {selectedFeedback.comments}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-[11px] text-slate-500">
                <div>
                  <strong>Source:</strong> {selectedFeedback.source || 'WEBSITE'}
                </div>
                <div>
                  <strong>Submitted:</strong> {new Date(selectedFeedback.createdAt).toLocaleString()}
                </div>
                <div>
                  <strong>Author:</strong>{' '}
                  {selectedFeedback.user?.email || selectedFeedback.submittedEmail || 'Anonymous'}
                </div>
                <div>
                  <strong>Email Delivery:</strong>{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedFeedback.emailDeliveryStatus || (selectedFeedback.emailDelivered ? 'ACCEPTED' : 'PENDING')}
                  </span>
                  {selectedFeedback.emailDeliveryError && (
                    <span className="block text-[10px] text-rose-500 truncate max-w-xs" title={selectedFeedback.emailDeliveryError}>
                      Error: {selectedFeedback.emailDeliveryError}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Private Admin Notes Thread */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Private Administrative Notes (Not visible to regular users)
              </span>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedFeedback.adminNotes && selectedFeedback.adminNotes.length > 0 ? (
                  selectedFeedback.adminNotes.map((n, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1"
                    >
                      <p className="text-slate-800 dark:text-slate-200">{n.note}</p>
                      <div className="text-[10px] text-slate-400 flex justify-between font-mono">
                        <span>{n.adminEmail}</span>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No admin notes yet.</p>
                )}
              </div>

              {/* Note composer */}
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add private note (e.g. delegated to frontend team)..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <Button size="sm" type="submit" disabled={noteLoading || !newNote.trim()} className="gap-1">
                  <Send className="w-3.5 h-3.5" />
                  Add
                </Button>
              </form>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedFeedback(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Google Forms CSV Import Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-extrabold text-sm">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Import Google Forms CSV Feedback
              </div>
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 leading-relaxed space-y-1">
              <p className="font-bold">Instructions:</p>
              <p>
                1. In your Google Forms spreadsheet, click <strong>File &gt; Download &gt; Comma Separated Values (.csv)</strong>.
              </p>
              <p>
                2. Either upload the downloaded file below or paste its text directly.
              </p>
            </div>

            {csvError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800">
                {csvError}
              </div>
            )}

            {csvResult && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-200 font-semibold border border-emerald-200 dark:border-emerald-800">
                ✅ Successfully imported {csvResult.importedCount} feedback records into MongoDB!
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  CSV Content
                </label>
                <label className="text-xs text-teal-600 dark:text-teal-400 font-semibold cursor-pointer hover:underline flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  Upload File
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={6}
                placeholder="Timestamp,Rating,Improvements,Features,Comments..."
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="w-full text-xs font-mono p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCsvModalOpen(false)}
                disabled={csvLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleImportCsv}
                disabled={csvLoading || !csvContent.trim()}
                className="gap-1.5"
              >
                {csvLoading && <LoadingSpinner size="sm" />}
                Import Records
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeedbackTab;
