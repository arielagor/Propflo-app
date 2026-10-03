import React, { useState } from 'react';
import { 
  WorkflowApproval, 
  ApprovalFeedback, 
  UserRole, 
  Department 
} from '../../types';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  Plus, 
  Filter, 
  Building2, 
  Send, 
  FileText, 
  ShieldAlert, 
  DollarSign,
  ArrowRight,
  TrendingUp,
  XCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { quickTriageTicket } from '../../services/geminiClient';

interface WorkflowDashboardProps {
  approvals: WorkflowApproval[];
  feedback: ApprovalFeedback[];
  userRole: UserRole;
  userName: string;
  onApprove: (id: string, reason?: string) => void;
  onReject: (id: string, reason?: string) => void;
  onRequestChanges: (id: string, reason: string) => void;
  onAddFeedback: (approvalId: string, message: string, type: ApprovalFeedback['type']) => void;
  onCreateApproval: (approval: Omit<WorkflowApproval, 'id' | 'createdAt' | 'updatedAt' | 'bottleneckHours'>) => void;
}

export const WorkflowDashboard: React.FC<WorkflowDashboardProps> = ({
  approvals,
  feedback,
  userRole,
  userName,
  onApprove,
  onReject,
  onRequestChanges,
  onAddFeedback,
  onCreateApproval,
}) => {
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>(approvals[0]?.id || '');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<ApprovalFeedback['type']>('comment');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [activeActionModal, setActiveActionModal] = useState<'approve' | 'reject' | 'changes' | null>(null);

  // New approval form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<WorkflowApproval['type']>('lease_agreement');
  const [newDept, setNewDept] = useState<Department>('leasing');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<WorkflowApproval['priority']>('medium');
  const [aiTriageLoading, setAiTriageLoading] = useState(false);
  const [aiTriageTip, setAiTriageTip] = useState<string | null>(null);

  const selectedApproval = approvals.find(a => a.id === selectedApprovalId) || approvals[0];
  const selectedFeedback = feedback.filter(f => f.approvalId === selectedApproval?.id);

  // Filtered approvals list
  const filteredApprovals = approvals.filter(item => {
    if (filterDepartment !== 'all' && item.department !== filterDepartment) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedApproval) return;
    onAddFeedback(selectedApproval.id, newComment, commentType);
    setNewComment('');
  };

  const handleExecuteAction = () => {
    if (!selectedApproval) return;
    if (activeActionModal === 'approve') {
      onApprove(selectedApproval.id, actionReason || 'Approved under standard protocol.');
    } else if (activeActionModal === 'reject') {
      onReject(selectedApproval.id, actionReason || 'Does not meet company requirements.');
    } else if (activeActionModal === 'changes') {
      onRequestChanges(selectedApproval.id, actionReason || 'Revisions required.');
    }
    setActiveActionModal(null);
    setActionReason('');
  };

  const handleQuickTriageAi = async () => {
    if (!newDesc && !newTitle) return;
    try {
      setAiTriageLoading(true);
      const res = await quickTriageTicket(`${newTitle}: ${newDesc}`);
      setAiTriageTip(res.fastTriage);
    } catch (err) {
      console.error(err);
    } finally {
      setAiTriageLoading(false);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onCreateApproval({
      title: newTitle,
      type: newType,
      department: newDept,
      amount: newAmount > 0 ? Number(newAmount) : undefined,
      requestedBy: 'user-active',
      requestedByName: userName,
      currentStage: `${newDept.toUpperCase()} Department Sign-off`,
      requiredRoles: ['property_manager', newDept === 'finance' ? 'finance_officer' : 'executive'],
      status: 'pending',
      priority: newPriority,
      description: newDesc,
    });

    setNewTitle('');
    setNewDesc('');
    setNewAmount(0);
    setAiTriageTip(null);
    setShowCreateModal(false);
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const bottleneckCount = approvals.filter(a => a.bottleneckHours > 24).length;
  const approvedCount = approvals.filter(a => a.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{pendingCount}</div>
          <div className="text-[11px] text-amber-400/90 mt-1 flex items-center gap-1 font-medium">
            <span>Awaiting inter-dept review</span>
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Critical Bottlenecks (&gt;24h)</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{bottleneckCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Realtime feedback active
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Processed This Month</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{approvedCount}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>94.5% SLA adherence</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/60 to-slate-800/80 border border-indigo-500/30 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automated Bureaucracy Engine</span>
          </div>
          <p className="text-[11px] text-slate-300 my-1">
            Auto-escalates bottlenecks to department heads after 12h idle.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Initiate New Approval</span>
          </button>
        </div>
      </div>

      {/* Main Approval Grid & Feedback Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Approvals List */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>Filter:</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterDepartment}
                onChange={e => setFilterDepartment(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="all">All Departments</option>
                <option value="leasing">Leasing</option>
                <option value="maintenance">Maintenance</option>
                <option value="finance">Finance / Accounting</option>
                <option value="legal">Legal & Compliance</option>
                <option value="executive">Executive</option>
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="changes_requested">Changes Requested</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Approvals Cards */}
          <div className="space-y-3">
            {filteredApprovals.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-8 text-center text-slate-400 text-xs">
                No workflow items found matching the selected filters.
              </div>
            ) : (
              filteredApprovals.map(appr => {
                const isSelected = selectedApproval?.id === appr.id;
                const isUrgent = appr.priority === 'urgent' || appr.bottleneckHours > 24;

                return (
                  <div
                    key={appr.id}
                    onClick={() => setSelectedApprovalId(appr.id)}
                    className={`cursor-pointer bg-slate-800 border rounded-2xl p-4 transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-slate-800/95 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-950/20'
                        : 'border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            appr.department === 'leasing' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            appr.department === 'maintenance' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                            appr.department === 'finance' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            appr.department === 'legal' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                            'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {appr.department}
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            appr.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            appr.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            appr.status === 'changes_requested' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            'bg-slate-600/30 text-slate-400 border border-slate-600'
                          }`}>
                            {appr.status.replace('_', ' ')}
                          </span>

                          {isUrgent && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Bottleneck: {appr.bottleneckHours}h</span>
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-100 text-sm">{appr.title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2">{appr.description}</p>
                      </div>

                      {appr.amount && (
                        <div className="text-right shrink-0">
                          <span className="text-xs text-slate-400 block">Total</span>
                          <span className="text-sm font-bold text-emerald-400">
                            ${appr.amount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>Stage: <strong className="text-slate-200">{appr.currentStage}</strong></span>
                        <span>•</span>
                        <span>By {appr.requestedByName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{appr.commentsCount || 0} comments</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Approval Details & Real-time Bottleneck Feedback Loop */}
        <div className="lg:col-span-5 space-y-4">
          {selectedApproval ? (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-5 sticky top-20 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                    Workflow Details • {selectedApproval.id.toUpperCase()}
                  </div>
                  <h2 className="text-base font-bold text-white mt-0.5">{selectedApproval.title}</h2>
                  <div className="text-xs text-slate-400 mt-1">
                    Department: <span className="text-slate-200 font-semibold uppercase">{selectedApproval.department}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                    selectedApproval.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    selectedApproval.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {selectedApproval.status.replace('_', ' ')}
                  </div>
                  {selectedApproval.amount && (
                    <div className="text-sm font-bold text-emerald-400 mt-1">
                      ${selectedApproval.amount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Stage Progress Bar */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/60">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Current Bottleneck:</span>
                  <span className="font-semibold text-rose-300">{selectedApproval.bottleneckHours} hours pending</span>
                </div>
                <div className="w-full bg-slate-700/60 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: selectedApproval.status === 'approved' ? '100%' : '65%' 
                    }}
                  ></div>
                </div>
                <div className="text-[11px] text-slate-300 mt-2 flex items-center justify-between">
                  <span>Stage: <strong>{selectedApproval.currentStage}</strong></span>
                  <span className="text-indigo-400">Requires {selectedApproval.requiredRoles.join(' / ')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setActiveActionModal('approve')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>

                <button
                  onClick={() => setActiveActionModal('changes')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-950/40 transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Request Revisions</span>
                </button>

                <button
                  onClick={() => setActiveActionModal('reject')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-950/40 transition"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>

              {/* Real-time Feedback & Bottleneck Resolution Stream */}
              <div className="space-y-3 pt-2 border-t border-slate-700/80">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Real-time Inter-Dept Feedback</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Instant Unblock Thread</span>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {selectedFeedback.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
                      No feedback recorded yet. Add a comment or condition waiver to address bottlenecks quickly.
                    </div>
                  ) : (
                    selectedFeedback.map(fb => (
                      <div 
                        key={fb.id} 
                        className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                          fb.type === 'revision_request' ? 'bg-rose-950/30 border-rose-800/40 text-rose-200' :
                          fb.type === 'waiver' ? 'bg-amber-950/30 border-amber-800/40 text-amber-200' :
                          fb.type === 'approval_reason' ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200' :
                          'bg-slate-900/80 border-slate-700/70 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-200">{fb.authorName}</span>
                          <span className="text-slate-400 uppercase font-semibold">
                            {fb.authorRole.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{fb.message}</p>
                        <div className="text-[9px] text-slate-400 flex items-center justify-between pt-1">
                          <span className="capitalize font-medium text-indigo-300">{fb.type.replace('_', ' ')}</span>
                          <span>{new Date(fb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Feedback Input Form */}
                <form onSubmit={handleSendFeedback} className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={commentType}
                      onChange={e => setCommentType(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 text-[11px] outline-none"
                    >
                      <option value="comment">Standard Comment</option>
                      <option value="revision_request">Revision Request</option>
                      <option value="waiver">Condition Waiver</option>
                      <option value="approval_reason">Approval Note</option>
                    </select>
                    <span className="text-[10px] text-slate-400">Post as {userName}</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type immediate feedback or waiver to address bottleneck..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-slate-400 text-xs">
              Select an approval workflow from the list to view its real-time bottleneck feedback.
            </div>
          )}
        </div>
      </div>

      {/* Action Dialog Modal (Approve / Reject / Changes) */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white capitalize">
              {activeActionModal === 'approve' ? 'Authorize & Approve Workflow' :
               activeActionModal === 'reject' ? 'Reject Workflow Item' : 'Request Department Revisions'}
            </h3>
            <p className="text-xs text-slate-300">
              Provide feedback or signing notes for <strong>{selectedApproval?.title}</strong>. This will be posted into the real-time feedback audit trail.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reason / Specific Instructions (Optional):
              </label>
              <textarea
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
                placeholder="Enter justification, budget code, or requested changes..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500 h-24"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                className={`px-4 py-1.5 text-white rounded-xl text-xs font-bold shadow transition ${
                  activeActionModal === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' :
                  activeActionModal === 'reject' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                Confirm {activeActionModal}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Workflow Approval Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Initiate Inter-Department Approval</span>
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Approval Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Roof Membrane Patch Repair (Bldg 4)"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={newDept}
                    onChange={e => setNewDept(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none"
                  >
                    <option value="leasing">Leasing</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="finance">Finance / Accounting</option>
                    <option value="legal">Legal & Compliance</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Workflow Type</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none"
                  >
                    <option value="maintenance_expense">Maintenance Expense</option>
                    <option value="lease_agreement">Lease Agreement</option>
                    <option value="vendor_contract">Vendor Contract</option>
                    <option value="rent_adjustment">Rent Adjustment</option>
                    <option value="legal_addendum">Legal Addendum</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Amount ($ USD)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional amount"
                    value={newAmount || ''}
                    onChange={e => setNewAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">Justification & Scope Details</label>
                  <button
                    type="button"
                    onClick={handleQuickTriageAi}
                    disabled={aiTriageLoading || (!newTitle && !newDesc)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{aiTriageLoading ? 'Triaging...' : 'AI Quick Triage'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Detail the background, quote details, emergency status, or lease terms..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {aiTriageTip && (
                <div className="p-2.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-[11px] text-indigo-200">
                  <span className="font-bold text-white block">Gemini Flash-Lite Fast Triage:</span>
                  {aiTriageTip}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/50"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
