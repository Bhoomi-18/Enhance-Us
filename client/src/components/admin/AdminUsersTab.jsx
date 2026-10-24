import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Eye,
  X,
  Clock,
  Sparkles,
} from 'lucide-react';
import { getAdminUsers, getAdminUserById, suspendUser, reactivateUser } from '../../services/adminService';
import LoadingSpinner from '../ui/LoadingSpinner';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';

export const AdminUsersTab = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verifiedFilter, setVerifiedFilter] = useState('ALL');
  const [classificationFilter, setClassificationFilter] = useState('ALL');

  // Modals / Actions
  const [suspendingUser, setSuspendingUser] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminUsers({
        page,
        limit,
        search,
        status: statusFilter,
        verified: verifiedFilter,
        classification: classificationFilter,
      });
      setUsers(res?.data?.users || []);
      setTotal(res?.data?.total || 0);
      setPages(res?.data?.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter, verifiedFilter, classificationFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleConfirmSuspend = async () => {
    if (!suspendingUser) return;
    if (!suspensionReason.trim()) {
      setActionError('Please specify a valid reason for account suspension.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      await suspendUser(suspendingUser._id, suspensionReason.trim());
      setSuspendingUser(null);
      setSuspensionReason('');
      fetchUsers();
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Failed to suspend account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReactivate = async (targetUser) => {
    if (!targetUser) return;
    if (!window.confirm(`Reactivate account for ${targetUser.email}?`)) return;

    setActionLoading(true);
    try {
      await reactivateUser(targetUser._id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to reactivate account.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              User Directory & Account Controls
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing <strong>{users.length}</strong> of <strong>{total}</strong> accounts
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </form>

          {/* Classification Filter */}
          <select
            value={classificationFilter}
            onChange={(e) => {
              setClassificationFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Accounts (Real & Demo)</option>
            <option value="REAL">Real Accounts Only</option>
            <option value="DEMO">Demo Showcase Only</option>
          </select>

          {/* Verification Filter */}
          <select
            value={verifiedFilter}
            onChange={(e) => {
              setVerifiedFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Verification States</option>
            <option value="VERIFIED">Verified Only</option>
            <option value="UNVERIFIED">Unverified Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <LoadingSpinner size="lg" label="Loading Users..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 dark:text-rose-400 font-semibold">
            {error}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs">No user accounts matched the filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Email Verified</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Profile</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {users.map((u) => {
                  const isDemo = Boolean(u.isDemo || u.email?.toLowerCase().includes('demo'));
                  const isSuspended = Boolean(u.isSuspended);

                  return (
                    <tr
                      key={u._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* User Column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 shrink-0 text-xs">
                            {u.avatar ? (
                              <img
                                src={u.avatar}
                                alt={u.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              (u.name || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {u.name}
                              {u.isAdminUser && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  <Shield className="w-2.5 h-2.5" /> Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Classification */}
                      <td className="py-3 px-4">
                        {isDemo ? (
                          <Badge variant="warning" size="sm">
                            Demo Showcase
                          </Badge>
                        ) : (
                          <Badge variant="info" size="sm">
                            Real Account
                          </Badge>
                        )}
                      </td>

                      {/* Email Verified */}
                      <td className="py-3 px-4">
                        {u.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                            <XCircle className="w-3.5 h-3.5" /> Unverified
                          </span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="py-3 px-4">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <Ban className="w-3 h-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Profile Completion */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-teal-500 h-full rounded-full"
                              style={{ width: `${u.profileCompletion || 0}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">
                            {u.profileCompletion || 0}%
                          </span>
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await getAdminUserById(u._id);
                              setSelectedUserDetails(res?.data || u);
                            } catch {
                              setSelectedUserDetails(u);
                            }
                          }}
                          title="View Profile Details"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {!isDemo && !u.isAdminUser && (
                          <>
                            {isSuspended ? (
                              <button
                                type="button"
                                onClick={() => handleConfirmReactivate(u)}
                                title="Reactivate Account"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSuspendingUser(u);
                                  setSuspensionReason('');
                                  setActionError('');
                                }}
                                title="Suspend Account"
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
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

      {/* Account Suspension Modal */}
      {suspendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm">
                <AlertTriangle className="w-5 h-5" />
                Suspend User Account
              </div>
              <button
                type="button"
                onClick={() => setSuspendingUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You are about to suspend <strong>{suspendingUser.email}</strong>. This account will immediately lose access to EnhanceUs services and existing sessions will be blocked.
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800">
                {actionError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Administrative Reason
              </label>
              <textarea
                rows={3}
                placeholder="Specify the reason (e.g. Terms of Service violation, spam)..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuspendingUser(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmSuspend}
                disabled={actionLoading}
                className="gap-1.5"
              >
                {actionLoading && <LoadingSpinner size="sm" />}
                Confirm Suspension
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Drawer / Modal */}
      {selectedUserDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-600" />
                Account Attributes
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUserDetails(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedUserDetails.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedUserDetails.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Role</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedUserDetails.role}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Profile Completion</span>
                  <span className="font-semibold text-teal-600">{selectedUserDetails.profileCompletion}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Sessions</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedUserDetails.stats?.sessionsCount ?? selectedUserDetails.sessionsCompleted ?? 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Goals Created</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedUserDetails.stats?.goalsCount ?? 0}</span>
                </div>
              </div>

              {selectedUserDetails.bio && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Biography</span>
                  <p className="text-slate-700 dark:text-slate-300">{selectedUserDetails.bio}</p>
                </div>
              )}

              {selectedUserDetails.skills && selectedUserDetails.skills.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-2">Offered Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUserDetails.skills.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold text-[11px] border border-teal-200 dark:border-teal-800">
                        {s.name} ({s.level})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedUserDetails.isSuspended && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-500">Suspension Details</span>
                  <p className="font-semibold">{selectedUserDetails.suspensionReason || 'No reason provided'}</p>
                  <p className="text-[10px] opacity-80">
                    Suspended on {new Date(selectedUserDetails.suspendedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedUserDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersTab;
